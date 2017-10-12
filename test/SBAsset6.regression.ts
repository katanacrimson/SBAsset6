//
// SBAsset6 - JS library for working with SBAsset6 archive format
// ---
// @copyright (c) 2017 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/>
// @reddit <https://reddit.com/u/katana__>
//
/* global describe it afterEach */
'use strict'

import * as crypto from 'crypto'
import * as path from 'path'
import * as fs from 'fs-extra'
import { expect } from 'chai'
import { SBAsset6 } from './../src/SBAsset6'

describe('SBAsset6 regression tests', () => {
  const tmpDir = path.join(__dirname, '/tmp')

  afterEach(async () => {
    let files = await fs.readdir(tmpDir + '/')
    for (const file of files) {
      if (file === '.gitkeep') {
        continue
      }

      try {
        await fs.unlink(path.join(tmpDir, file))
      } catch (err) {
        // noop
      }
    }
  })

  it('rtest-i#4: non-JSON files should not be corrupted on read', async () => {
    const hash1 = crypto.createHash('sha256')
    const hash2 = crypto.createHash('sha256')

    let samplePath = path.join(__dirname, '/regression/rt-i4')
    let pak = new SBAsset6(path.join(samplePath, '/rt-i4.pak'))
    await pak.load()
    let sample = await pak.files.getFile('/sfx/white_noise.ogg')

    await fs.writeFile(tmpDir + '/_white_noise.ogg', sample)

    let stream1 = fs.createReadStream(tmpDir + '/_white_noise.ogg')
    let stream2 = fs.createReadStream(samplePath + '/mod/sfx/white_noise.ogg')

    let getChecksum = (stream: fs.ReadStream, hash: crypto.Hash) => {
      return new Promise((resolve, reject) => {
        stream.on('data', (data) => {
          hash.update(data)
        })
        stream.on('end', () => {
          resolve(hash.digest('hex'))
        })
      })
    }

    let checksum1 = await getChecksum(stream1, hash1)
    let checksum2 = await getChecksum(stream2, hash2)

    expect(checksum1).to.equal(checksum2)
  })
})
