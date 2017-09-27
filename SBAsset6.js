//
// SBAsset6 - JS library for working with SBAsset6 archive format.
// ---
// @copyright (c) 2017 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/SBAsset6>
//
/*jslint node: true, asi: true */
'use strict'

const fs = require('fs-extra')
const { Uint64BE } = require('int64-buffer')
const ConsumableBuffer = require('ConsumableBuffer')
const ConsumableFile = require('ConsumableFile')
const ExpandingBuffer = require('ExpandingBuffer')
const ExpandingFile = require('ExpandingFile')
const StreamPipeline = require('StreamPipeline')
const SBON = require('SBON')
const FileMapper = require('./FileMapper')

//
// SBAsset6 - provides an abstraction around reading/interacting with SBAsset6 archives (also known as Starbound "pak" files)
//
module.exports = class SBAsset6 {
	/**
	 * SBAsset6 Constructor
	 *
	 * @param  {String} path - The filepath for the archive we're going to work with.
	 * @return {SBAsset6}
	 */
	constructor(path) {
		this.path = path
		this.pak = this.metatablePosition = null
		this.metadata = null
		this.files = new FileMapper()
	}

	/**
	 * Loads the archive, parses everything out and then provides access to the archive files and metadata.
	 * This is a convenience method for the common workflow of loading the archive.
	 *
	 * @return {Promise:Object} - An object containing the metadata and all files contained in the archive that can be read out.
	 */
	async load() {
		// first, open the pak file up
		this.pak = new ConsumableFile(this.path)
		await this.pak.open()

		// read/verify the header
		this.metatablePosition = await SBAsset6._readHeader(this.pak)

		// extract the metatable
		const meta = await SBAsset6._readMetatable(this.pak, this.metatablePosition)

		meta.filetable
		for(const fileEntry of meta.filetable) {
			await this.files.setFile(fileEntry.path, {
				pak: this,
				start: fileEntry.offset,
				filelength: fileEntry.filelength
			})
		}
		this.metadata = meta.metadata

		// return the important metatable info.
		return {
			metadata: this.metadata,
			files: this.files.list()
		}
	}

	/**
	 * Gets a specific chunk of data from the pak file we're working with.
	 *
	 * @private
	 * @param  {Uint64BE} offset - How far into the pak to seek to.
	 * @param  {Uint64BE} size - The amount of data to fetch.
	 * @return {Promise:Buffer} - The data we're looking for.
	 */
	async getPakData(offset, size) {
		return SBAsset6._getFile(this.pak, offset, size)
	}

	/**
	 * Save the currently generated SBAsset6 archive.
	 * @return {[type]} [description]
	 */
	async save() {
		const newFile = new ExpandingFile(this.path + '.tmp')
		await newFile.open()

		// set up the Stream Pipeline...
		const sfile = new StreamPipeline()
		await sfile.load(newFile)

		// write the header
		await sfile.pump(Buffer.from('SBAsset6'))

		// write a placeholder for the metatable position (8 bytes, a Uint64BE)
		await sfile.pump(Buffer.alloc(8))

		let files = this.files.list(),
			filetable = []
		for(const file of files) {
			const type = this.files.getFileMeta(file)

			let res = null
			switch(type) {
				case 'pak':
					res = await sfile.pump(file.source.pak.fd, file.start, file.filelength)
				break

				case 'fd':
				case 'path':
					res = await sfile.pump(file.source, file.start, file.filelength)
				break

				case 'buffer':
					res = await sfile.pump(file.source)
				break

				default:
					throw new TypeError('oops')
			}

			filetable.push({
				path: file.virtualPath,
				offset: new Uint64BE(res.offset),
				filelength: new Uint64BE(res.wrote)
			})
		}

		const metatablePosition = new Uint64BE(newFile.position)
		SBAsset6._buildMetatable()
	}

	/**
	 * Reads the header of a file and identifies if it is SBAsset6 format.
	 * @access private
	 *
	 * @param {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {Promise:Uint64BE} - A Big-endian Uint64 value containing the file offset for the archive metatable.
	 */
	static async _readHeader(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBAsset6._readHeader expects a ConsumableBuffer or ConsumableFile.')
		}

		// grab the first 8 bytes - this should be a standard SBAsset6 pak header
		// we'll compare it to what we expect to verify that this *is* an SBAsset6 file
		if(Buffer.compare(await sbuf.read(8), Buffer.from('SBAsset6')) !== 0) {
			throw new Error('File does not appear to be SBAsset6 format.')
		}

		// next 8 bytes should be a big-endian uint64 with the byte-offset position of the metatable
		return new Uint64BE(await sbuf.read(8))
	}

	/**
	 * Reads the metatable, given the correct position, and parses out the filetable and archive metadata.
	 * @access private
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @param  {Uint64BE} metatablePosition - The Uint64BE containing the metatable location within the archive.
	 * @return {Promise:Object} - An Object that contains the metadata and filetable of the archive.
	 */
	static async _readMetatable(sbuf, metatablePosition) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBAsset6._readMetatable expects a ConsumableBuffer or ConsumableFile.')
		}

		if(!(metatablePosition instanceof Uint64BE)) {
			throw new TypeError('SBAsset6._readMetatable expects a Uint64BE object for a metatablePosition.')
		}

		// head to the metatable!
		await sbuf.aseek(metatablePosition)

		// verify that we've found the metatable as expected
		if(Buffer.compare(await sbuf.read(5), Buffer.from('INDEX')) !== 0) {
			throw new Error('Failed to correctly seek to metatable header.')
		}

		// grab the metadata, an SBON map
		const metadata = await SBON.readMap(sbuf)

		// how many files are in this pak?
		const numFiles = await SBON.readVarInt(sbuf)

		// read the file table from the metadata...
		let filetable = [],
			i = numFiles
		while(i--) {
			const pathLength = (await sbuf.read(1)).readUInt8(0)
			const filePath = (await sbuf.read(pathLength)).toString()
			const fileOffset = new Uint64BE(await sbuf.read(8))
			const filelength = new Uint64BE(await sbuf.read(8))
			filetable.push({
				offset: fileOffset,
				filelength: filelength,
				path: filePath
			})
		}

		return {
			metadata: metadata,
			filetable: filetable,
		}
	}

	/**
	 * Gets a file of specified length from a specific offset within the archive.
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @param  {Uint64BE} offset - Offset in bytes of the file's location in the archive.
	 * @param  {Uint64BE} filelength - Length in bytes for the file.
	 * @return {Promise:Buffer} - The buffer containing the contents of the specified file.
	 */
	static async _getFile(sbuf, offset, filelength) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBAsset6._getFile expects a ConsumableBuffer or ConsumableFile.')
		}

		if(!(offset instanceof Uint64BE)) {
			throw new TypeError('SBAsset6._getFile expects a Uint64BE instance for an offset.')
		}

		if(!(filelength instanceof Uint64BE)) {
			throw new TypeError('SBAsset6._getFile expects a Uint64BE instance for a filelength.')
		}

		await sbuf.aseek(offset)
		return sbuf.read(filelength)
	}

	static async _buildMetatable(metadata, filetable) {
		let sbuf = new ExpandingBuffer()

		await sbuf.write('INDEX')
		await SBON.writeMap(sbuf, metadata)
		await SBON.writeVarInt(sbuf, Object.values(filetable).length)

		for(let file of filetable) {
			let pathBuffer = Buffer.from(file.path)
			if(pathBuffer.length > 255) {
				throw new RangeError('SBAsset6._buildMetatable expects all filetable virtual paths to be under 255 bytes.')
			}

			if(!(file.offset instanceof Uint64BE)) {
				throw new TypeError('SBAsset6._buildMetatable expects filetable entries provide Uint64BE object for the represented file offset.')
			}

			if(!(file.filelength instanceof Uint64BE)) {
				throw new TypeError('SBAsset6._buildMetatable expects filetable entries provide Uint64BE object for the represented file length.')
			}

			let buf = Buffer.alloc(1)
			buf.writeUint8(pathBuffer.length)

			await sbuf.write(buf)
			await sbuf.write(file.path)
			await sbuf.write(file.offset)
			await sbuf.write(file.filelength)
		}

		return sbuf.getCurrentBuffer()
	}
}