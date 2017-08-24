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

const ConsumableBuffer = require('./ConsumableBuffer')
const ConsumableFile = require('./ConsumableFile')
const bigInt = require('big-integer')

//
// SBON - provides a library of functions for reading/parsing SBON ("Starbound Object Notation").
//
// lovingly ported from blixt's py-starbound sbon.py module
// @url <https://github.com/blixt/py-starbound/blob/master/starbound/sbon.py>
// @license MIT license
//
// for good Reverse-Engineering documentation on the SBON format, reference:
// <https://github.com/blixt/py-starbound/blob/master/FORMATS.md#sbon>
//
module.exports = class SBON {
	/**
	 * Reads a variable integer from the provided ConsumableBuffer or ConsumableFile.
	 * Relies on bigInt for mathematical operations as we're performing mathematical operations beyond JS's native capabilities.
	 *
	 * See also: <https://en.wikipedia.org/wiki/Variable-length_quantity>
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {Number} - The javascript number form of the varint we just read.
	 */
	static async readVarInt(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readVarInt expects a ConsumableBuffer or ConsumableFile.')
		}

		let value = bigInt(0)
		while(true) {
			let byte = await sbuf.read(1)
			byte = bigInt(byte.readUIntBE(0, 1))
			if(byte.and(0b10000000).isZero()) {
				value = value.shiftLeft(7).or(byte)
				if(value.isZero()) { // no, stop giving us -0! STAHP!
					value = value.abs()
				}
				return value.toJSNumber()
			}
			value = value.shiftLeft(7).or(byte.and(0b01111111))
		}
	}

	/**
	 * Reads a *signed* variable integer from the provided ConsumableBuffer or ConsumableFile.
	 * Relies on bigInt for mathematical operations as we're performing mathematical operations beyond JS's native capabilities.
	 *
	 * See also: <https://en.wikipedia.org/wiki/Variable-length_quantity>
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {Number} - The javascript number form of the signed varint we just read.
	 */
	static async readVarIntSigned(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readVarIntSigned expects a ConsumableBuffer or ConsumableFile.')
		}

		let value = bigInt(await this.readVarInt(sbuf))
		if(!value.and(1).isZero()) {
			return value.shiftRight(1).times(-1).minus(1).toJSNumber()
		} else {
			return value.shiftRight(1).toJSNumber()
		}
	}

	/**
	 * Reads a series of bytes from the provided ConsumableBuffer or ConsumableFile.
	 * We expect that the first thing read will be a varint which will indicate how many bytes overall we will need to read.
	 * This is commonly used for a UTF-8 string, with a varint indicating how many bytes will compose the string.
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {Buffer} - A buffer instance containing the bytes read.
	 */
	static async readBytes(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readBytes expects a ConsumableBuffer or ConsumableFile.')
		}

		// starts with a varint to indicate the length of the byte series
		const length = await this.readVarInt(sbuf)
		if(length > 0) {
			return await sbuf.read(length)
		} else {
			return Buffer.alloc(0)
		}
	}

	/**
	 * Reads a series of bytes from the provided ConsumableBuffer or ConsumableFile and reencodes them into a string.
	 * Most of the work here is done in readBytes - we just transform the Buffer here into a UTF-8 stream after it's gotten our bytes.
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {String} - A UTF-8 string.
	 */
	static async readString(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readString expects a ConsumableBuffer or ConsumableFile.')
		}

		return (await this.readBytes(sbuf)).toString('utf8')
	}

	/**
	 * Reads a dynamic-typed chunk of data from the provided ConsumableBuffer or ConsumableFile.
	 * Our first byte indicates the type, which then determines who will handle the rest.
	 * This farms out to the other SBON functions as necessary.
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return mixed - Too many potential return types to document. You'll get something - can't really tell you what, though.
	 */
	static async readDynamic(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readDynamic expects a ConsumableBuffer or ConsumableFile.')
		}

		// first byte of a dynamic type is always the type indicator
		const type = await sbuf.read(1)
		switch(type.readUIntBE(0, 1)) {
			case 1: // Nil-value
				return null
			case 2: // 64-bit float
				return (await sbuf.read(8)).readDoubleBE(0)
			case 3: // Boolean
				let byte = await sbuf.read(1)
				return (Buffer.compare(byte, Buffer.from([0x01])) === 0)
			case 4: // Signed varint
				return await this.readVarIntSigned(sbuf)
			case 5: // String
				return await this.readString(sbuf)
			case 6: // List
				return await this.readList(sbuf)
			case 7: // Map
				return await this.readMap(sbuf)
			default:
				throw new Error('Unknown dynamic type 0x' + type.toString('hex') + ' encountered in SBON.readDynamic')
		}
	}

	/**
	 * Reads a list from the provided ConsumableBuffer or ConsumableFile.
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {Array} - An Array used as a list.
	 */
	static async readList(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readList expects a ConsumableBuffer or ConsumableFile.')
		}

		// first chunk is a varint that indicates the length of the list (how many array entries)
		// all values are dynamic types
		const length = await this.readVarInt(sbuf)
		let value = [], i = length
		while(i--) {
			const listVal = await this.readDynamic(sbuf)
			value.push(listVal)
		}

		return value
	}

	/**
	 * Reads a map (which we use a generic Object to represent) from the provided ConsumableBuffer or ConsumableFile.
	 *
	 * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
	 * @return {Object} - An Object used as a key-value map.
	 */
	static async readMap(sbuf) {
		if(!(sbuf instanceof ConsumableBuffer || sbuf instanceof ConsumableFile)) {
			throw new TypeError('SBON.readMap expects a ConsumableBuffer or ConsumableFile.')
		}

		// first chunk is a varint that indicates the length of the map (how many key-value pairs)
		// keys are assumed strings, while values are dynamic types
		const length = await this.readVarInt(sbuf)
		let value = {}, i = length

		while(i--) {
			let key = await this.readString(sbuf)
			value[key] = await this.readDynamic(sbuf)
		}

		return value
	}
}