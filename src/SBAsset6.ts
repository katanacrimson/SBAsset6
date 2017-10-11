//
// SBAsset6 - JS library for working with SBAsset6 archive format.
// ---
// @copyright (c) 2017 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/SBAsset6>
//
'use strict'

import { EventEmitter } from 'events'
import * as fs from 'fs-extra'
import { Uint64BE } from 'int64-buffer'
import { ConsumableBuffer } from 'ConsumableBuffer'
import { ConsumableFile } from 'ConsumableFile'
import { ExpandingBuffer } from 'ExpandingBuffer'
import { ExpandingFile } from 'ExpandingFile'
import { StreamPipeline } from 'StreamPipeline'
import { SBON } from 'SBON'
import { FileMapper } from './FileMapper'

export interface LoadResult {
  metadata: { [index:string] : any }
  files: Array<string>
}

export interface Metatable {
  metadata: { [index:string] : any }
  filetable: Array<FileTableEntry>
}

export interface FileTableEntry {
  path: string
  offset: Uint64BE
  filelength: Uint64BE
}

//
// SBAsset6 - provides an abstraction around reading/interacting with SBAsset6 archives (also known as Starbound "pak" files)
//
export class SBAsset6 {
  path: string
  file: ConsumableFile | undefined
  metatablePosition: Uint64BE | undefined
  metadata: { [index:string] : any }
  files: FileMapper
  progress: EventEmitter

  /**
   * SBAsset6 Constructor
   *
   * @param  {String} path - The filepath for the archive we're going to work with.
   * @return {SBAsset6}
   */
  constructor (path: string) {
    this.path = path
    this.file = this.metatablePosition = undefined
    this.metadata = {}
    this.files = new FileMapper()
    this.progress = new EventEmitter()
  }

  /**
   * Loads the archive, parses everything out and then provides access to the archive files and metadata.
   * This is a convenience method for the common workflow of loading the archive.
   *
   * @return {Promise:Object} - An object containing the archive's metadata and all files contained in the archive that can be read out.
   */
  async load (): Promise<LoadResult> {
    // first, open the pak file up
    this.file = new ConsumableFile(this.path)
    this.progress.emit('load.start', { message: 'Loading archive file', target: this.path })
    await this.file.open()

    // read/verify the header
    this.progress.emit('load.header', { message: 'Reading archive header' })
    this.metatablePosition = await SBAsset6._readHeader(this.file)

    // extract the metatable
    this.progress.emit('load.metatable', { message: 'Reading archive metatable' })
    const meta = await SBAsset6._readMetatable(this.file, this.metatablePosition)

    this.progress.emit('load.files', { message: 'Loading archive file data into FileMapper', total: meta.filetable.length })
    for (const i in meta.filetable) {
      const fileEntry = meta.filetable[i]
      this.progress.emit('load.file.progress', { message: 'Loading file into FileMapper', target: fileEntry.path, index: i })
      await this.files.setFile(fileEntry.path, {
        source: {
          pak: this
        },
        start: fileEntry.offset,
        filelength: fileEntry.filelength
      })
    }
    this.metadata = meta.metadata

    // return the important metatable info.
    this.progress.emit('load.done', { message: 'Loading archive file complete' })
    return {
      metadata: this.metadata,
      files: await this.files.list()
    }
  }

  /**
   * Close the SBAsset6 archive and flush everything from memory.
   * Does not save changes!
   *
   * @return {Promise:void}
   */
  async close (): Promise<void> {
    if (this.file) {
      this.progress.emit('close', { message: 'Closing archive file' })
      await this.file.close()
    }
    this.file = this.metatablePosition = undefined
    this.metadata = {}
    this.files = new FileMapper()

    return undefined
  }

  /**
   * Get whether or not the pak itself has been "loaded" from the filesystem.
   * Instances that are *going* to be created will be considered "unloaded" as no original pak exists.
   *
   * @return {Promise:Boolean}
   */
  async isLoaded (): Promise<boolean> {
    return this.file !== undefined
  }

  /**
   * Gets a specific chunk of data from the pak file we're working with.
   *
   * @private
   * @param  {Uint64BE} offset - How far into the pak to seek to.
   * @param  {Uint64BE} size - The amount of data to fetch.
   * @return {Promise:Buffer} - The data we're looking for.
   */
  async getPakData (offset: Uint64BE, size: Uint64BE): Promise<Buffer> {
    if(!this.file) {
      throw new Error('Cannot read from unopened pak in SBAsset6.getPakData')
    }

    return SBAsset6._getFile(this.file, offset, size)
  }

  /**
   * Save the currently generated SBAsset6 archive.
   * Reloads the archive and rebuilds the FileMapper when saving is complete.
   *
   * @return {Promise:Object} - An object containing the archive's metadata and all files contained in the archive that can be read out.
   */
  async save (): Promise<LoadResult> {
    const newFile = new ExpandingFile(this.path + '.tmp')
    this.progress.emit('save.start', { message: 'Opening destination archive file', target: this.path })
    await newFile.open()

    // set up the Stream Pipeline...
    const sfile = new StreamPipeline()
    await sfile.load(newFile)

    // write the header
    this.progress.emit('save.header', { message: 'Writing archive header' })
    await sfile.pump(Buffer.from('SBAsset6'))

    // write a placeholder for the metatable position (8 bytes, a Uint64BE)
    await sfile.pump(Buffer.alloc(8))

    const files = await this.files.list()
    let filetable = []
    this.progress.emit('save.files', { message: 'Writing files to archive', total: files.length })
    for (const i in files) {
      const filename = files[i]
      const file = await this.files.getFileMeta(filename)

      let start = (file.start instanceof Uint64BE) ? file.start.toNumber() : file.start
      let filelength = (file.filelength instanceof Uint64BE) ? file.filelength.toNumber() : file.filelength

      let res = null
      this.progress.emit('save.file.progress', { message: 'Writing file to archive', target: file.virtualPath, type: file.type, index: i })
      switch (file.type) {
        case 'pak':
          if(!file.source.pak || !file.source.pak.file) {
            throw new Error('Could not load file from SBAsset6 archive while saving.')
          }
          res = await sfile.pump(file.source.pak.file.fd, start, filelength)
          break

        case 'fd':
          res = await sfile.pump(file.source.fd, start, filelength)
          break

        case 'path':
          res = await sfile.pump(file.source.path, start, filelength)
          break

        case 'buffer':
          res = await sfile.pump(file.source.buffer)
          break

        default:
          throw new TypeError('Unrecognized FileTableEntry type in SBAsset6.save')
      }

      filetable.push({
        path: file.virtualPath,
        offset: new Uint64BE(res.offset),
        filelength: new Uint64BE(res.wrote)
      })
    }

    this.progress.emit('save.metatable', { message: 'Writing archive metatable' })
    const metatablePosition = new Uint64BE(newFile.position)
    await sfile.pump(await SBAsset6._buildMetatable(this.metadata, filetable))

    // metatable position should always be a Uint64BE found at 0x00000008
    await fs.write(newFile.fd, metatablePosition.toBuffer(), 0, 8, 8)
    await newFile.close()
    await this.close()

    this.progress.emit('save.done', { message: 'Saving archive file complete' })
    await fs.move(this.path + '.tmp', this.path, { overwrite: true })

    return this.load()
  }

  /**
   * Reads the header of a file and identifies if it is SBAsset6 format.
   * @access private
   *
   * @param {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
   * @return {Promise:Uint64BE} - A Big-endian Uint64 value containing the file offset for the archive metatable.
   */
  static async _readHeader (sbuf: ConsumableBuffer|ConsumableFile): Promise<Uint64BE> {
    // grab the first 8 bytes - this should be a standard SBAsset6 pak header
    // we'll compare it to what we expect to verify that this *is* an SBAsset6 file
    if (Buffer.compare(await sbuf.read(8), Buffer.from('SBAsset6')) !== 0) {
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
  static async _readMetatable (sbuf: ConsumableBuffer|ConsumableFile, metatablePosition: Uint64BE): Promise<Metatable> {
    // head to the metatable!
    await sbuf.aseek(metatablePosition.toNumber())

    // verify that we've found the metatable as expected
    if (Buffer.compare(await sbuf.read(5), Buffer.from('INDEX')) !== 0) {
      throw new Error('Failed to correctly seek to metatable header.')
    }

    // grab the metadata, an SBON map
    const metadata = await SBON.readMap(sbuf)

    // how many files are in this pak?
    const numFiles = await SBON.readVarInt(sbuf)

    // read the file table from the metadata...
    let filetable = []
    let i = numFiles
    while (i--) {
      const filePath = await SBON.readString(sbuf)
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
      filetable: filetable
    }
  }

  /**
   * Gets a file of specified length from a specific offset within the archive.
   *
   * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
   * @param  {Uint64BE} offset - Offset in bytes of the file's location in the archive.
   * @param  {Uint64BE} filelength - Length in bytes for the file.
   * @return {Promise:Buffer} - The buffer containing the contents of the specified file.
   */
  static async _getFile (sbuf: ConsumableBuffer|ConsumableFile, offset: Uint64BE, filelength: Uint64BE): Promise<Buffer> {
    await sbuf.aseek(offset.toNumber())
    return sbuf.read(filelength.toNumber())
  }

  /**
   * Builds the metatable used for SBAsset6 archives.
   *
   * @param  {Object} metadata - The object containing the metadata for the SBasset6 archive.
   * @param  {Array} filetable - Array of objects representing the filetable.
   *   Each entry should contain a virtual path, a Uint64BE instance for an offset, and a Uint64BE instance of a filelength.
   * @return {Promise:Buffer} - The Buffer instance containing the exact SBAsset6 archive.
   */
  static async _buildMetatable (metadata: { [index:string]: any }, filetable: Array<FileTableEntry>) {
    let sbuf = new ExpandingBuffer()

    if (metadata === null || typeof metadata !== 'object') {
      throw new TypeError('SBAsset6._buildMetatable expects the metadata to be an object.')
    }
    if (!Array.isArray(filetable)) {
      throw new TypeError('SBAsset6._buildMetatable expects the filetable to be an array.')
    }

    await sbuf.write('INDEX')
    await SBON.writeMap(sbuf, metadata)
    await SBON.writeVarInt(sbuf, Object.values(filetable).length)

    for (let file of filetable) {
      await SBON.writeString(sbuf, file.path)
      await sbuf.write(file.offset.toBuffer())
      await sbuf.write(file.filelength.toBuffer())
    }

    return sbuf.getCurrentBuffer()
  }
}
