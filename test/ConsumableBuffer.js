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

const { expect } = require('chai')
const { ConsumableBuffer } = require('./../index')

describe('ConsumableBuffer tests', () => {
	const buf = Buffer.from('INDEX')
	let sbuf = null
	beforeEach(() => {
		sbuf = new ConsumableBuffer(buf)
	})

	describe('ConsumableBuffer.read', () => {
		it('should consume the Buffer when calling read', async () => {
			let res = null

			res = await sbuf.read(1)
			expect(res).to.be.an.instanceof(Buffer)
			expect(res.toString()).to.equal('I')

			res = await sbuf.read(1)
			expect(res).to.be.an.instanceof(Buffer)
			expect(res.toString()).to.equal('N')
		})

		it('should throw an Error when provided something other than a number for bytes to read', async () => {
			let res = null
			try {
				await sbuf.read(null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('Bytes parameter must be a positive integer.')
		})

		it('should throw an Error when a negative number of bytes is specified', async () => {
			let res = null
			try {
				await sbuf.read(-1)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('Bytes parameter must be a positive integer.')
		})

		it('should throw a RangeError when the initial buffer has been exhausted', async () => {
			let res = null
			await sbuf.seek(5)
			try {
				await sbuf.read(1)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(RangeError)
			expect(res.message).to.equal('Buffer exhausted; attempted to read beyond buffer.')
		})
	})

	describe('ConsumableBuffer.reset', () => {
		it('should return the original buffer when calling reset', async () => {
			let res = null

			await sbuf.read(2)
			res = await sbuf.reset()

			expect(res).to.be.an.instanceof(Buffer)
			// Buffer.compare is designed for use with sorting, where it returns [-1,0,1]
			// ...in our case, zero means equivalence
			expect(Buffer.compare(buf, res)).to.equal(0)
		})

		it('should read from the beginning after calling reset', async () => {
			let res = null

			await sbuf.read(2)
			await sbuf.reset()

			res = await sbuf.read(1)
			expect(res.toString()).to.equal('I')
		})
	})

	describe('ConsumableBuffer.seek', () => {
		it('should seek forward the given number of bytes', async () => {
			let res = null

			await sbuf.seek(1)
			res = await sbuf.read(1)

			expect(res.toString()).to.equal('N')

			await sbuf.seek(2)
			res = await sbuf.read(1)

			expect(res.toString()).to.equal('X')
		})

		it('should return undefined on seek', async () => {
			let res = null

			res = await sbuf.seek(1)
			expect(res).to.be.undefined
		})

		it('should throw an Error when provided something other than a number for bytes to seek', async () => {
			let res = null
			try {
				await sbuf.seek(null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('Bytes parameter must be a positive integer.')
		})

		it('should throw an Error when a negative number of bytes is specified', async () => {
			let res = null
			try {
				await sbuf.seek(-1)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('Bytes parameter must be a positive integer.')
		})

		it('should throw a RangeError when the trying to seek beyond the current buffer', async () => {
			let res = null
			try {
				await sbuf.seek(6)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(RangeError)
			expect(res.message).to.equal('Buffer exhausted; attempted to seek beyond buffer.')
		})
	})

	describe('ConsumableBuffer.aseek', () => {
		it('should seek the given number of bytes from the beginning of the buffer', async () => {
			let res = null

			await sbuf.aseek(1)
			res = await sbuf.read(1)

			expect(res.toString()).to.equal('N')

			await sbuf.aseek(1)
			res = await sbuf.read(1)

			expect(res.toString()).to.equal('N')
		})

		it('should return undefined on seek', async () => {
			let res = null

			res = await sbuf.aseek(1)
			expect(res).to.be.undefined
		})

		it('should throw an Error when provided something other than a number for bytes to seek', async () => {
			let res = null
			try {
				await sbuf.aseek(null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('Bytes parameter must be a positive integer.')
		})

		it('should throw an Error when a negative number of bytes is specified', async () => {
			let res = null
			try {
				await sbuf.aseek(-1)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('Bytes parameter must be a positive integer.')
		})

		it('should throw a RangeError when the trying to seek beyond the current buffer', async () => {
			let res = null
			try {
				await sbuf.aseek(6)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(RangeError)
			expect(res.message).to.equal('Buffer exhausted; attempted to seek beyond buffer.')
		})
	})

	describe('ConsumableBuffer.getCurrentBuffer', () => {
		it('should return the remaining buffer for reads/seeks', async () => {
			let res = null

			await sbuf.seek(2)
			res = await sbuf.getCurrentBuffer()
			expect(res).to.be.an.instanceof(Buffer)
			expect(res.toString()).to.equal('DEX')
		})
	})
})