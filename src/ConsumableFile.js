//
// SBAsset6 - JS library for working with SBAsset6 archive format
// ---
// @copyright (c) 2017 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/>
// @reddit <https://reddit.com/u/katana__>
//
/*jslint node: true, asi: true */
'use strict'

const fs = require('fs-extra')

//
// ConsumableFile - provides a "consumable" buffer stream from a file descriptor to ease reading/parsing of byte-level resources.
//
module.exports = class ConsumableFile {
	/**
	 * ConsumableFile constructor
	 * @param  {String} path - Path to the file that we're going to be "consuming".
	 * @return {ConsumableFile}
	 */
	constructor(path) {
		this.path = path
		this.fd = this.filesize = this.position = null
	}

	/**
	 * Opens the file for reading based off of the path provided to the constructor.
	 * @return {Promise:undefined} - Returns undefined.
	 */
	async open() {
		this.fd = await fs.open(this.path, 'r', 0o666)
		const stats = await fs.fstat(this.fd)
		this.filesize = stats.size
		this.position = 0

		return undefined
	}

	/**
	 * Closes the file, preventing future reading.
	 * @return {Promise:undefined} - Returns undefined.
	 */
	async close() {
		await fs.close(this.fd)
		this.fd = this.filesize = this.position = null

		return undefined
	}

	/**
	 * Reads within the file.
	 * @param  {Number} bytes - The number of bytes to read and advance within the buffer.
	 * @return {Promise:Buffer} - Returns a buffer containing the next selected bytes from the ConsumableFile.
	 */
	async read(bytes) {
		if(isNaN(bytes) || bytes <= 0) {
			throw new Error('Bytes parameter must be a positive integer.')
		}
		bytes = parseInt(bytes)

		if((this.position + bytes) > this.filesize) {
			throw new RangeError('File exhausted; attempted to read beyond file.')
		}

		const { bytesRead, buffer } = await fs.read(this.fd, Buffer.alloc(bytes), 0, bytes, this.position)
		this.position += bytes
		if(bytesRead !== bytes) {
			throw new Error('Failed to read number of bytes requested.') // ???
		}

		return buffer
	}

	/**
	 * Seeks within the file to reposition for read, relative to the current position.
	 * @param  {Number} bytes - The number of bytes to shift within the buffer; this can be negative.
	 * @return {Promise:undefined} - Returns undefined.
	 */
	async seek(bytes) {
		await this.aseek(this.position += bytes)

		return undefined
	}

	/**
	 * Seeks within the file to reposition for read, using an absolute position.
	 * @param  {Number} bytes - How many bytes into the file do we want to seek?
	 * @return {Promise:undefined} - Returns undefined.
	 */
	async aseek(bytes) {
		if(isNaN(bytes) || bytes <= 0) {
			throw new Error('Bytes parameter must be a positive integer.')
		}

		if(this.position > this.filesize) {
			throw new RangeError('File exhausted; attempted to seek beyond file.')
		}

		this.position = Math.floor(bytes)

		return undefined
	}
}