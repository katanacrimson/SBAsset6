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
const { expect } = require('chai')
const { Uint64BE } = require('int64-buffer')
const SBAsset6 = require('./../SBAsset6')
const ConsumableBuffer = require('ConsumableBuffer')

describe('SBAsset6', () => {
	describe('SBAsset6._readHeader', () => {
		it('should throw if passed something other than a ConsumableBuffer or ConsumableFile', async () => {
			let res = null
			try {
				await SBAsset6._readHeader(null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBAsset6._readHeader expects a ConsumableBuffer or ConsumableFile.')
		})

		it('should throw if the file does not appear to be an SBAsset6 formatted archive', async () => {
			const buf = Buffer.from('BADERROR00000000')
			const sbuf = new ConsumableBuffer(buf)

			let res = null
			try {
				await SBAsset6._readHeader(sbuf)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('File does not appear to be SBAsset6 format.')
		})

		it('should return the correct metadata position from a provided header', async () => {
			const buf = Buffer.from([
				0x53, 0x42, 0x41, 0x73, 0x73, 0x65, 0x74, 0x36,
				0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x67
			])
			const sbuf = new ConsumableBuffer(buf)
			const expected = new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x67]))

			const res = await SBAsset6._readHeader(sbuf)
			expect(res).to.deep.equal(expected)
		})
	})

	describe('SBAsset6._readMetatable', () => {
		it('should throw if passed something other than a ConsumableBuffer or ConsumableFile', async () => {
			const metatablePosition = new Uint64BE(0)

			let res = null
			try {
				await SBAsset6._readMetatable(null, metatablePosition)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBAsset6._readMetatable expects a ConsumableBuffer or ConsumableFile.')
		})

		it('should throw if passed something other than a Uint64BE for a metatablePosition', async () => {
			const buf = Buffer.alloc(0)
			const sbuf = new ConsumableBuffer(buf)

			let res = null
			try {
				await SBAsset6._readMetatable(sbuf, null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBAsset6._readMetatable expects a Uint64BE object for a metatablePosition.')
		})

		it('should return the correct metatable information from a provided metatable', async () => {
			const buf = Buffer.from([
				0x00, 0x49, 0x4E, 0x44, 0x45, 0x58, 0x01, 0x08,
				0x70, 0x72, 0x69, 0x6F, 0x72, 0x69, 0x74, 0x79,
				0x04, 0xCA, 0xC0, 0xDF, 0x8F, 0x7E, 0x01, 0x1D,
				0x2F, 0x75, 0x6E, 0x69, 0x76, 0x65, 0x72, 0x73,
				0x65, 0x5F, 0x73, 0x65, 0x72, 0x76, 0x65, 0x72,
				0x2E, 0x63, 0x6F, 0x6E, 0x66, 0x69, 0x67, 0x2E,
				0x70, 0x61, 0x74, 0x63, 0x68, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00, 0x57
			])
			const metatablePosition = new Uint64BE(1)
			const sbuf = new ConsumableBuffer(buf)
			const expected = {
				metadata: {
					priority: 9999999999
				},
				fileTable: {
					'/universe_server.config.patch': {
						offset: new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10])),
						filelength: new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57]))
					}
				}
			}

			const res = await SBAsset6._readMetatable(sbuf, metatablePosition)
			expect(res).to.deep.equal(expected)
		})
	})

	describe('SBAsset6._getFile', () => {
		it('should throw if passed something other than a ConsumableBuffer or ConsumableFile', async () => {
			const offset = new Uint64BE(0)
			const length = new Uint64BE(0)

			let res = null
			try {
				await SBAsset6._getFile(null, offset, length)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBAsset6._getFile expects a ConsumableBuffer or ConsumableFile.')
		})

		it('should throw if passed something other than a Uint64BE for an offset', async () => {
			const buf = Buffer.alloc(0)
			const sbuf = new ConsumableBuffer(buf)
			const length = new Uint64BE(0)

			let res = null
			try {
				await SBAsset6._getFile(sbuf, null, length)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBAsset6._getFile expects a Uint64BE object for an offset.')
		})

		it('should throw if passed something other than a Uint64BE for a filelength', async () => {
			const buf = Buffer.alloc(0)
			const sbuf = new ConsumableBuffer(buf)
			const offset = new Uint64BE(0)

			let res = null
			try {
				await SBAsset6._getFile(sbuf, offset, null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBAsset6._getFile expects a Uint64BE object for a filelength.')
		})

		it('should correctly get a file from a provided archive', async () => {
			const buf = Buffer.from([
				0x08, 0x5B, 0x0D, 0x0A, 0x20, 0x20, 0x7B, 0x0D,
				0x0A, 0x20, 0x20, 0x20, 0x20, 0x22, 0x6F, 0x70,
				0x22, 0x3A, 0x20, 0x22, 0x72, 0x65, 0x70, 0x6C,
				0x61, 0x63, 0x65, 0x22, 0x2C, 0x0D, 0x0A, 0x20,
				0x20, 0x20, 0x20, 0x22, 0x70, 0x61, 0x74, 0x68,
				0x22, 0x3A, 0x20, 0x22, 0x2F, 0x77, 0x6F, 0x72,
				0x6B, 0x65, 0x72, 0x50, 0x6F, 0x6F, 0x6C, 0x54,
				0x68, 0x72, 0x65, 0x61, 0x64, 0x73, 0x22, 0x2C,
				0x0D, 0x0A, 0x20, 0x20, 0x20, 0x20, 0x22, 0x76,
				0x61, 0x6C, 0x75, 0x65, 0x22, 0x3A, 0x20, 0x36,
				0x0D, 0x0A, 0x20, 0x20, 0x7D, 0x0D, 0x0A, 0x5D
			])
			const sbuf = new ConsumableBuffer(buf)
			const offset = new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]))
			const length = new Uint64BE(Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x57]))
			const expected = await fs.readFile(__dirname + '/samples/universe_server.config.patch', {
				encoding: 'utf8',
				flag: 'r'
			})

			const res = await SBAsset6._getFile(sbuf, offset, length)
			expect(res).to.equal(expected)
		})
	})
})

describe('SBAsset6 integration test', () => {
	it('should work as expected on a small sample SBAsset6 archive', async () => {
		const filename = __dirname + '/samples/more-threads.pak'
		const pak = new SBAsset6(filename)
		let expected = {
			metadata: {
				priority: 9999999999
			},
			files: [
				'/universe_server.config.patch'
			]
		}
		let res = await pak.load()
		expect(res).to.deep.equal(expected)

		expected = await fs.readFile(__dirname + '/samples/universe_server.config.patch', { encoding: 'utf8', flag: 'r' })
		res = await pak.getFile('/universe_server.config.patch')
		expect(res).to.equal(expected)
	})

	it('should work as expected on a large sample SBAsset6 archive', async () => {
		const filename = __dirname + '/samples/ExampleMod.pak'
		const pak = new SBAsset6(filename)
		let expected = {
			metadata: JSON.parse(await fs.readFile(__dirname + '/samples/ExampleMod.metadata', { encoding: 'utf8', flag: 'r' })),
			files: [
				'/items/somefile3.json',
				'/items/generic/crafting/somefile7.json',
				'/items/generic/crafting/somefile4.json',
				'/items/blah/somefile.json',
				'/items/somefile5.json',
				'/items/somefile2.json',
				'/items/generic/somefile3.json',
				'/items/generic/somefile.json',
				'/items/blah/somefile3.json',
				'/items/generic/crafting/somefile.json',
				'/items/generic/crafting/somefile9.json',
				'/items/generic/crafting/somefile6.json',
				'/items/generic/crafting/somefile3.json',
				'/items/somefile.json',
				'/items/somefile4.json',
				'/items/generic/somefile2.json',
				'/items/blah/somefile2.json',
				'/items/generic/crafting/somefile8.json',
				'/items/generic/crafting/somefile5.json',
				'/items/generic/crafting/somefile2.json'
			]
		}
		let res = await pak.load()
		expect(res).to.deep.equal(expected)
	})
})