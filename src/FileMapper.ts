//
// SBAsset6 - JS library for working with SBAsset6 archive format.
// ---
// @copyright (c) 2017 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/SBAsset6>
//
'use strict'

import * as fs from 'fs-extra'
import { Uint64BE } from 'int64-buffer'
import { SBAsset6 } from './SBAsset6'

export interface FileMapperEntry {
  type: string
  virtualPath: string
  source: {
    pak?: SBAsset6
    path?: string
    fd?: number
    buffer?: Buffer
  }
  start?: Uint64BE
  filelength?: Uint64BE
}

export interface FileTableInput {
  source: {
    pak?: SBAsset6,
    path?: string,
    fd?: number,
    buffer?: Buffer
  }
  start?: Uint64BE,
  filelength?: Uint64BE
}

//
// FileMapper - provides an abstraction around SBAsset6 file tables for sensibly managing files contained within the archive
//
export class FileMapper {
  filetable: { [index: string]: FileMapperEntry }
  /**
   * FileMapper Constructor
   *
   * @return {FileMapper}
   */
  constructor () {
    this.filetable = {}
  }

  /**
   * Lists all "files" mapped in the FileMapper.
   *
   * @return {Promise:Array} - Array of virtual filepaths that are currently registered within the FileMapper.
   */
  async list (): Promise<Array<string>> {
    return Object.keys(this.filetable)
  }

  /**
   * Identifies if a "file" exists at the specified virtualPath.
   *
   * @param  {String} virtualPath - The virtualPath to check for existence.
   * @return {Promise:Boolean}
   */
  async exists (virtualPath: string): Promise<boolean> {
    return !!this.filetable[virtualPath]
  }

  /**
   * Get the "file" metadata for the specified filepath (basically, where to load the file from).
   *
   * @private
   * @param  {String} virtualPath - The virtualPath to get metadata for.
   * @return {Promise:Object} - File metadata for loading.
   */
  async getFileMeta (virtualPath: string): Promise<FileMapperEntry> {
    if (!(await this.exists(virtualPath))) {
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
  async getFile (virtualPath: string): Promise<Buffer> {
    if (!(await this.exists(virtualPath))) {
      throw new Error('No file exists at the specified virtualPath.')
    }

    const options = await this.getFileMeta(virtualPath)

    if (options.source.pak) {
      if (options.start === undefined || options.filelength === undefined) {
        throw new Error('FileMapper.getFile requires that file table entries for paks provide a start and filelength.')
      }

      return options.source.pak.getPakData(options.start, options.filelength)
    } else if (options.source.path || options.source.fd) {
      let fd: number = 0
      if (options.source.path) {
        fd = await fs.open(options.source.path, 'r')
      } else if (options.source.fd) {
        fd = options.source.fd
      }

      let { size } = await fs.fstat(fd)
      const position = options.start ? options.start.toNumber() : 0
      let maxRead = position - size
      if (options.filelength && options.filelength.toNumber() < maxRead) {
        maxRead = options.filelength.toNumber()
      }

      const { buffer } = await fs.read(fd, Buffer.alloc(maxRead), 0, maxRead, position)

      if (options.type === 'path') {
        await fs.close(fd)
      }

      return buffer
    } else if (options.source.buffer) {
      return options.source.buffer
    } else {
      throw new TypeError('Cannot get specified file\'s contents.')
    }
  }

  /**
   * Set file metadata for the given filepath.
   *   This does NOT merge with previous properties, so specify everything (including old) at once.
   *
   * @param {String} virtualPath - The virtualPath to set file metadata for.
   * @param {Object} options - The metadata to set.
   * @return {Promise:void}
   */
  async setFile (virtualPath: string, options: FileTableInput): Promise<void> {
    options = options || {}

    let fileOptions: FileMapperEntry
    if (options.source.pak) {
      if (options.start === undefined || options.filelength === undefined) {
        throw new Error('FileMapper.setFile requires that pak entries to also provide a start and filelength.')
      }

      fileOptions = {
        type: 'pak',
        virtualPath: virtualPath,
        source: {
          pak: options.source.pak
        },
        start: options.start || undefined,
        filelength: options.filelength || undefined
      }
    } else if (options.source.fd) {
      fileOptions = {
        type: 'fd',
        virtualPath: virtualPath,
        source: {
          fd: options.source.fd
        },
        start: options.start || undefined,
        filelength: options.filelength || undefined
      }
    } else if (options.source.path) {
      fileOptions = {
        type: 'path',
        virtualPath: virtualPath,
        source: {
          path: options.source.path
        },
        start: options.start || undefined,
        filelength: options.filelength || undefined
      }
    } else if (options.source.buffer) {
      fileOptions = {
        type: 'buffer',
        virtualPath: virtualPath,
        source: {
          buffer: options.source.buffer
        }
      }
    } else {
      throw new TypeError('FileMapper.setFile requires either a SBAsset6 instance, a file descriptor, a filepath, or a Buffer be specified for the source.')
    }

    this.filetable[virtualPath] = fileOptions

    return
  }

  /**
   * Delete a specified "file" from the archive.
   * Simply removes the metadata entry; it will just be excluded when the new archive is built.
   *
   * @param  {String} virtualPath - The virtualPath of the file to delete.
   * @return {Promise:void}
   */
  async deleteFile (virtualPath: string): Promise<void> {
    if (await this.exists(virtualPath)) {
      delete this.filetable[virtualPath]
    }

    return
  }
}
