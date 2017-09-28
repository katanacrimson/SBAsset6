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
// const ExpandingBuffer = require('ExpandingBuffer')
const ExpandingFile = require('ExpandingFile')
const StreamPipeline = require('StreamPipeline')
const SBON = require('SBON')

//
// FileMapper - provides an abstraction around SBAsset6 file tables for sensibly managing files contained within the archive
//
module.exports = class FileMapper {
	/**
	 * FileMapper Constructor
	 *
	 * @return {FileMapper}
	 */
	constructor() {
		this.filetable = {}
	}

	/**
	 * Lists all "files" mapped in the FileMapper.
	 *
	 * @return {Array} - Array of virtual filepaths that are currently registered within the FileMapper.
	 */
	list() {
		return Object.keys(this.filetable)
	}

	/**
	 * Identifies if a "file" exists at the specified virtualPath.
	 *
	 * @param  {String} virtualPath - The virtualPath to check for existence.
	 * @return {Boolean}
	 */
	exists(virtualPath) {
		return this.filetable[virtualPath] !== undefined
	}

	/**
	 * Get the "file" metadata for the specified filepath (basically, where to load the file from).
	 * @param  {String} virtualPath - The virtualPath to get metadata for.
	 * @return {Object} - File metadata for loading.
	 */
	getFileMeta(virtualPath) {
		if(!this.exists(virtualPath)) {
			throw new Error('No file exists at the specified virtualPath.')
		}

		return this.filetable[virtualPath]
	}

	/**
	 * Gets the contents of the "file" at the specified virtualPath.
	 *
	 * @param  {String} virtualPath - The virtualPath to load the "file" from.
	 * @return {Promise:Buffer} - The "file" contents, as a Buffer instance.
	 */
	async getFile(virtualPath) {
		if(!this.exists(virtualPath)) {
			throw new Error('No file exists at the specified virtualPath.')
		}

		const options = this.getFileMeta(virtualPath)

		switch(options.type) {
			case 'pak':
				return options.source.getPakData(options.start, options.filelength)
			break

			case 'fd':
			case 'path':
				let fd = null
				if(options.type === 'path') {
					fd = await fs.open(options.source, 'r')
				} else if(options.fd !== null) {
					fd = options.source
				}

				let { size } = await fs.fstat(fd)
				const position = options.start || 0
				const filelength = options.filelength || (start - size)

				const { bytesRead, buffer } = await fs.read(fd, Buffer.alloc(filelength), 0, filelength, start)

				if(options.type === 'path') {
					await fs.close(fd)
				}

				return buffer
			break

			case 'buffer':
				return options.source
			break

			default:
				throw new TypeError('Cannot get specified file\'s contents.')
		}
	}

	/**
	 * Set file metadata for the given filepath.
	 *   This does NOT merge with previous properties, so specify everything (including old) at once.
	 *
	 * @param {String} virtualPath - The virtualPath to set file metadata for.
	 * @param {Object} options - The metadata to set.
	 * @return {Promise:undefined}
	 */
	async setFile(virtualPath, options) {
		options = options || {}

		let fileOptions = {}
		if(options.pak !== undefined) {
			// can't actually instanceof check because node refuses to load SBAsset6.js...because lol circular dependency
			//   so instead, we're gonna fake it. :D
			if(options.pak.getPakData === undefined) {
				throw new TypeError('FileMapper.setFile expects that options.pak be an instance of SBAsset6')
			}

			if(options.start === undefined || options.filelength === undefined) {
				throw new Error('FileMapper.setFile requires that pak entries to also provide a start and filelength.')
			}

			fileOptions = {
				type: 'pak',
				virtualPath: virtualPath,
				source: options.pak,
				start: options.start,
				filelength: options.filelength
			}
		} else if(options.fd !== undefined || options.path !== undefined) {
			if(options.fd !== undefined) {
				fileOptions = {
					type: 'fd',
					virtualPath: virtualPath,
					source: options.fd
				}
			} else if(options.path !== undefined) {
				fileOptions = {
					type: 'path',
					virtualPath: virtualPath,
					source: options.path
				}
			}

			if(options.start !== undefined) {
				fileOptions.start = options.start
			}
			if(options.filelength !== undefined) {
				fileOptions.filelength = options.filelength
			}
		} else if(options.buffer !== undefined) {
			fileOptions = {
				type: 'buffer',
				virtualPath: virtualPath,
				source: options.buffer
			}
		} else {
			throw new TypeError('FileMapper.setFile requires either a ConsumableFile, a file descriptor, a filepath, or a Buffer be specified for the origin')
		}

		// additional type-safety checks... (I really need to consider moving to typescript, ugh)
		if(fileOptions.start !== undefined && !(fileOptions.start instanceof Uint64BE)) {
			throw new TypeError('FileMapper.setFile requires options.start be an instance of Uint64BE')
		}

		if(fileOptions.filelength !== undefined && !(fileOptions.filelength instanceof Uint64BE)) {
			throw new TypeError('FileMapper.setFile requires options.filelength be an instance of Uint64BE')
		}

		this.filetable[virtualPath] = fileOptions

		return undefined
	}

	/**
	 * Delete a specified "file" from the archive.
	 * Simply removes the metadata entry; it will just be excluded when the new archive is built.
	 *
	 * @param  {String} virtualPath - The virtualPath of the file to delete.
	 * @return {undefined}
	 */
	deleteFile(virtualPath) {
		if(this.filetable[virtualPath] !== undefined) {
			delete this.filetable[virtualPath]
		}

		return undefined
	}
}