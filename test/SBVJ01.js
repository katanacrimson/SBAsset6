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
const { SBVJ01, ConsumableBuffer } = require('./../index')

describe('SBVJ01', () => {
	describe('SBVJ01._readHeader', () => {
		it('should throw if passed something other than a ConsumableBuffer or ConsumableFile', async () => {
			let res = null
			try {
				await SBVJ01._readHeader(null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBVJ01._readHeader expects a ConsumableBuffer or ConsumableFile.')
		})

		it('should throw if the file does not appear to be an SBVJ01 formatted archive', async () => {
			const buf = Buffer.from('LOLNOTTHATFILETYPE')
			const sbuf = new ConsumableBuffer(buf)

			let res = null
			try {
				await SBVJ01._readHeader(sbuf)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(Error)
			expect(res.message).to.equal('File does not appear to be SBVJ01 format.')
		})

		it('should not throw when it finds the correct header', async () => {
			const buf = Buffer.from([
				0x53, 0x42, 0x56, 0x4A, 0x30, 0x31, 0x54, 0x45,
				0x53, 0x54
			])
			console.log(buf.toString())
			const sbuf = new ConsumableBuffer(buf)

			const res = await SBVJ01._readHeader(sbuf)
			expect(res).to.be.undefined
		})
	})

	describe('SBVJ01._readData', () => {
		it('should throw if passed something other than a ConsumableBuffer or ConsumableFile', async () => {
			let res = null
			try {
				await SBVJ01._readData(null)
			} catch(err) {
				res = err
			}
			expect(res).to.be.an.instanceof(TypeError)
			expect(res.message).to.equal('SBVJ01._readData expects a ConsumableBuffer or ConsumableFile.')
		})

		xit('should correctly return JSON from a versioned JSON payload', async () => {
			// todo
		})
	})
})

describe('SBVJ01 integration test', () => {
	xit('should work as expected on a small sample SBVJ01 file', async () => {
		const filename = __dirname + '/samples/more-threads.pak'
		const pak = new SBVJ01(filename)
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

	xit('should work as expected on a large sample SBVJ01 archive', async () => {
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