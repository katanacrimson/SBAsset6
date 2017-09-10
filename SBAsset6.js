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
const SBON = require('SBON')

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
		this.fileTable = this.files = this.metadata = null
	}

	/**
	 * Loads the archive, parses everything out and then provides access to the archive files and metadata.
	 * This is a convenience method for the common workflow of loading the archive.
	 *
	 * @return {Promise:object} - An object containing the metadata and all files contained in the archive that can be read out.
	 */
	async load() {
		// first, open the pak file up
		this.pak = new ConsumableFile(this.path)
		await this.pak.open()

		// read/verify the header
		this.metatablePosition = await SBAsset6._readHeader(this.pak)

		// extract the metatable
		const meta = await SBAsset6._readMetatable(this.pak, this.metatablePosition)
		this.fileTable = meta.fileTable
		this.files = Object.keys(this.fileTable)
		this.metadata = meta.metadata

		// return the important metatable info.
		return {
			metadata: this.metadata,
			files: this.files
		}
	}

	/**
	 * Get a specific file from the archive.
	 *
	 * @param  {String} filename - The path to the file inside the archive that we want.
	 * @return {Promise:String} - The contents of the file we want to fetch.
	 */
	async getFile(filename) {
		if(this.fileTable === null) {
			throw new Error('Filetable empty - please use SBAsset6._readMetatable() first.')
		}

		if(!this.fileTable[filename]) {
			throw new Error('Nothing found in filetable for file "' + filename + '"')
		}

		return await SBAsset6._getFile(this.pak, this.fileTable[filename].offset, this.fileTable[filename].filelength)
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
	 * Reads the metatable, given the correct position, and parses out the fileTable and archive metadata.
	 * @access private
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @param  {Uint64BE} metatablePosition - The Uint64BE containing the metatable location within the archive.
	 * @return {Promise:Object} - An Object that contains the metadata and fileTable of the archive.
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
		let fileTable = {},
			i = numFiles
		while(i--) {
			const pathLength = (await sbuf.read(1)).readUInt8(0)
			const filePath = (await sbuf.read(pathLength)).toString()
			const fileOffset = new Uint64BE(await sbuf.read(8))
			const fileLength = new Uint64BE(await sbuf.read(8))
			fileTable[filePath] = {
				offset: fileOffset,
				filelength: fileLength
			}
		}

		return {
			metadata: metadata,
			fileTable: fileTable,
		}
	}

	/**
	 * Gets a file of specified length from a specific offset within the archive.
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @param  {Uint64BE} offset - Offset in bytes of the file's location in the archive.
	 * @param  {Uint64BE} filelength - Length in bytes for the file.
	 * @return {Promise:String} - The contents of the specified file.
	 */
	static async _getFile(sbuf, offset, filelength) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBAsset6._getFile expects a ConsumableBuffer or ConsumableFile.')
		}

		if(!(offset instanceof Uint64BE)) {
			throw new TypeError('SBAsset6._getFile expects a Uint64BE object for an offset.')
		}

		if(!(filelength instanceof Uint64BE)) {
			throw new TypeError('SBAsset6._getFile expects a Uint64BE object for a filelength.')
		}

		await sbuf.aseek(offset)
		return (await sbuf.read(filelength)).toString()
	}
}
