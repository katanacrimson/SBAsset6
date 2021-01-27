"use strict";
//
// SBAsset6 - JS library for working with SBAsset6 archive format.
// ---
// @copyright (c) 2018 Damian Bushong <katana@odios.us>
// @license MIT license
// @url <https://github.com/damianb/SBAsset6>
//
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const fs = require("fs-extra");
const int64_buffer_1 = require("int64-buffer");
const byteaccordion_1 = require("byteaccordion");
const sbon_1 = require("sbon");
const FileMapper_1 = require("./FileMapper");
class SBAsset6 {
    /**
     * SBAsset6 is a class which abstracts and provides a solid library for parsing and working with SBAsset6 formatted archive files
     *   (otherwise known as Starbound .pak files).
     *
     * @param  path - The filepath for the archive we're going to work with.
     * @return {SBAsset6}
     *
     * @example
     * ```
     * import { SBAsset6 } from 'sbasset6'
     * const filepath = '/path/to/mod.pak'
     *
     * const pak = new SBAsset6(filepath)
     * const { metadata, files } = await pak.load()
     *
     * let fileContents = await pak.getFile('/path/inside/of/pak/to/file.config')
     * // note, this file should exist within the files array above
     * ```
     */
    constructor(path) {
        this.path = path;
        this.file = this.metatablePosition = undefined;
        this.metadata = {};
        this.files = new FileMapper_1.FileMapper();
        this.progress = new events_1.EventEmitter();
    }
    /**
     * Reads the header of a file and identifies if it is SBAsset6 format.
     *
     * @private
     * @hidden
     *
     * @throws {Error} - Throws when the file provided does not appear to be an SBAsset6 archive.
     *
     * @param  sbuf - The stream to read from.
     * @return {Promise<Uint64BE>} - A Big-endian Uint64 value containing the file offset for the archive metatable.
     */
    static async _readHeader(sbuf) {
        // grab the first 8 bytes - this should be a standard SBAsset6 pak header
        // we'll compare it to what we expect to verify that this *is* an SBAsset6 file
        if (Buffer.compare(await sbuf.read(8), Buffer.from('SBAsset6')) !== 0) {
            throw new Error('File does not appear to be SBAsset6 format.');
        }
        // next 8 bytes should be a big-endian uint64 with the byte-offset position of the metatable
        return new int64_buffer_1.Uint64BE(await sbuf.read(8));
    }
    /**
     * Reads the metatable, given the correct position, and parses out the filetable and archive metadata.
     *
     * @private
     * @hidden
     *
     * @throws {Error} - Throws when the metatable pointer does not seem to correctly locate the metatable.
     *
     * @param  sbuf - The stream to read from.
     * @param  metatablePosition - The Uint64BE containing the metatable location within the archive.
     * @return {Promise<Metatable>} - An Object that contains the metadata and filetable of the archive.
     */
    static async _readMetatable(sbuf, metatablePosition) {
        // head to the metatable!
        await sbuf.aseek(metatablePosition.toNumber());
        // verify that we've found the metatable as expected
        if (Buffer.compare(await sbuf.read(5), Buffer.from('INDEX')) !== 0) {
            throw new Error('Failed to correctly seek to metatable header.');
        }
        // grab the metadata, an SBON map
        const metadata = await sbon_1.SBON.readMap(sbuf);
        // how many files are in this pak?
        const numFiles = await sbon_1.SBON.readVarInt(sbuf);
        // read the file table from the metadata...
        let filetable = [];
        let i = numFiles;
        while (i--) {
            const filePath = await sbon_1.SBON.readString(sbuf);
            const fileOffset = new int64_buffer_1.Uint64BE(await sbuf.read(8));
            const filelength = new int64_buffer_1.Uint64BE(await sbuf.read(8));
            filetable.push({
                offset: fileOffset,
                filelength: filelength,
                path: filePath
            });
        }
        return {
            metadata: metadata,
            filetable: filetable
        };
    }
    /**
     * Gets a file of specified length from a specific offset within the archive.
     *
     * @private
     * @hidden
     *
     * @param  sbuf - The stream to read from.
     * @param  offset - Offset in bytes of the file's location in the archive.
     * @param  filelength - Length in bytes for the file.
     * @return {Promise<Buffer>} - The buffer containing the contents of the specified file.
     */
    static async _getFile(sbuf, offset, filelength) {
        await sbuf.aseek(offset.toNumber());
        return sbuf.read(filelength.toNumber());
    }
    /**
     * Builds the metatable used for SBAsset6 archives.
     *
     * @private
     * @hidden
     *
     * @param  metadata - The object containing the metadata for the SBasset6 archive.
     * @param  filetable - Array of objects representing the filetable.
     *   Each entry should contain a virtual path, a Uint64BE instance for an offset, and a Uint64BE instance of a filelength.
     * @return {Promise<Buffer>} - The Buffer instance containing the exact SBAsset6 archive.
     */
    static async _buildMetatable(metadata, filetable) {
        let sbuf = new byteaccordion_1.ExpandingBuffer();
        await sbuf.write('INDEX');
        await sbon_1.SBON.writeMap(sbuf, metadata);
        await sbon_1.SBON.writeVarInt(sbuf, Object.values(filetable).length);
        for (let file of filetable) {
            await sbon_1.SBON.writeString(sbuf, file.path);
            await sbuf.write(file.offset.toBuffer());
            await sbuf.write(file.filelength.toBuffer());
        }
        return sbuf.buf;
    }
    /**
     * Loads the archive, parses everything out and then provides access to the archive files and metadata.
     * This is a convenience method for the common workflow of loading the archive.
     *
     * @return {Promise<LoadResult>} - An object containing the archive's metadata and all files contained in the archive that can be read out.
     *
     * @emits load.start - `{ message, target }` - `target` is the archive we're trying to load.
     * @emits load.header - `{ message }`
     * @emits load.metatable - `{ message }`
     * @emits load.files - `{ message, total }` - `total` is the total number of files found in the archive.
     * @emits load.file.progress - `{ message, target, index }` - `target` is the virtualPath the file whose metadata we're loading into the FileMapper,
     *   and `index` tells us how many files in we are (X, where "File X of Y").
     * @emits load.done - `{ message }`
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * const { metadata, files } = await pak.load()
     * ```
     */
    async load() {
        // first, open the pak file up
        this.file = new byteaccordion_1.ConsumableFile(this.path);
        this.progress.emit('load.start', { message: 'Loading archive file', target: this.path });
        await this.file.open();
        // read/verify the header
        this.progress.emit('load.header', { message: 'Reading archive header' });
        this.metatablePosition = await SBAsset6._readHeader(this.file);
        // extract the metatable
        this.progress.emit('load.metatable', { message: 'Reading archive metatable' });
        const meta = await SBAsset6._readMetatable(this.file, this.metatablePosition);
        this.progress.emit('load.files', { message: 'Loading archive file data into FileMapper', total: meta.filetable.length });
        for (const i in meta.filetable) {
            const fileEntry = meta.filetable[i];
            this.progress.emit('load.file.progress', { message: 'Loading file into FileMapper', target: fileEntry.path, index: i });
            await this.files.setFile(fileEntry.path, {
                source: {
                    pak: this
                },
                start: fileEntry.offset,
                filelength: fileEntry.filelength
            });
        }
        this.metadata = meta.metadata;
        // return the important metatable info.
        this.progress.emit('load.done', { message: 'Loading archive file complete' });
        return {
            metadata: this.metadata,
            files: await this.files.list()
        };
    }
    /**
     * Close the SBAsset6 archive and flush everything from memory.
     * Does not save changes!
     *
     * @return {Promise<void>}
     *
     * @emits close - `{ message }`
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * const { metadata, files } = await pak.load()
     * // you know have access to metadata and files. yay!
     *
     * // ...
     *
     * // all done here. time to clean up and release resources.
     *
     * await pak.close()
     * ```
     */
    async close() {
        if (this.file) {
            this.progress.emit('close', { message: 'Closing archive file' });
            await this.file.close();
        }
        this.file = this.metatablePosition = undefined;
        this.metadata = {};
        this.files = new FileMapper_1.FileMapper();
        return;
    }
    /**
     * Get whether or not the pak itself has been "loaded" from the filesystem.
     * Instances that are *going* to be created will be considered "unloaded" as no original pak exists.
     *
     * @return {Promise<boolean>}
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * const { metadata, files } = await pak.load()
     * // you know have access to metadata and files. yay!
     *
     * // ...
     *
     * // wait, did we load the pak earlier? has it been closed since? let's check...
     * const isOpen = await pak.isLoaded()
     * ```
     */
    async isLoaded() {
        return this.file !== undefined;
    }
    /**
     * Gets a specific chunk of data from the pak file we're working with.
     *
     * @private
     * @hidden
     *
     * @throws {Error} - Throws when the pak file hasn't been opened yet.
     *
     * @param  offset - How far into the pak to seek to.
     * @param  size - The amount of data to fetch.
     * @return {Promise<Buffer>} - The data we're looking for.
     */
    async getPakData(offset, size) {
        if (!this.file) {
            throw new Error('Cannot read from unopened pak in SBAsset6.getPakData');
        }
        return SBAsset6._getFile(this.file, offset, size);
    }
    /**
     * Save the currently generated SBAsset6 archive.
     * Reloads the archive and rebuilds the FileMapper when saving is complete.
     *
     * @return {Promise<LoadResult>} - An object containing the archive's metadata and all files contained in the archive that can be read out.
     *
     * @emits save.start - `{ message, target }` - `target` is the archive we're trying to save to.
     * @emits save.header - `{ message }`
     * @emits save.files - `{ message, total }` - `total` is the total number of files being written to the archive.
     * @emits save.file.progress - `{ message, target, index }` - `target` is the virtualPath the file that we're writing to the archive,
     *   and `index` tells us how many files in we are (X, where "File X of Y").
     * @emits save.metatable - `{ message }`
     * @emits save.done - `{ message }`
     *
     * @throws {Error} - Throws when we couldn't load a source file from a provided file descriptor.
     * @throws {Error} - Throws when we couldn't load a source file from a provided file path.
     * @throws {Error} - Throws when we couldn't load a source file from a provided buffer.
     * @throws {TypeError} - Throws when we have an unexpected file.type in the FileMapper.
     * @throws {Error} - Throws when the file descriptor for the new file we're trying to save is closed early.
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     *
     * // This pak's description was too long. Let's change it.
     * pak.metadata.description = 'Shorter description.'
     *
     * // Need to save our changes now...
     * await pak.save()
     * ```
     */
    async save() {
        const newFile = new byteaccordion_1.ExpandingFile(this.path + '.tmp');
        this.progress.emit('save.start', { message: 'Opening destination archive file', target: this.path });
        await newFile.open();
        // set up the Stream Pipeline...
        const sfile = new byteaccordion_1.StreamPipeline();
        await sfile.load(newFile);
        // write the header
        this.progress.emit('save.header', { message: 'Writing archive header' });
        await sfile.pump(Buffer.from('SBAsset6'));
        // write a placeholder for the metatable position (8 bytes, a Uint64BE)
        await sfile.pump(Buffer.alloc(8));
        const files = await this.files.list();
        let filetable = [];
        this.progress.emit('save.files', { message: 'Writing files to archive', total: files.length });
        for (const i in files) {
            const filename = files[i];
            const file = await this.files.getFileMeta(filename);
            let start = (file.start instanceof int64_buffer_1.Uint64BE) ? file.start.toNumber() : file.start;
            let filelength = (file.filelength instanceof int64_buffer_1.Uint64BE) ? file.filelength.toNumber() : file.filelength;
            let res = null;
            this.progress.emit('save.file.progress', { message: 'Writing file to archive', target: file.virtualPath, type: file.type, index: i });
            switch (file.type) {
                case 'pak':
                    if (!file.source.pak || !file.source.pak.file || !file.source.pak.file.fd) {
                        throw new Error('Could not load file from SBAsset6 archive while saving.');
                    }
                    res = await sfile.pump(file.source.pak.file.fd, start, filelength);
                    break;
                case 'fd':
                    if (!file.source.fd) {
                        throw new Error('Could not load file from provided file descriptor while saving.');
                    }
                    res = await sfile.pump(file.source.fd, start, filelength);
                    break;
                case 'path':
                    if (!file.source.path) {
                        throw new Error('Could not load file from provided file path while saving.');
                    }
                    res = await sfile.pump(file.source.path, start, filelength);
                    break;
                case 'buffer':
                    if (!file.source.buffer) {
                        throw new Error('Could not load file from provided Buffer while saving.');
                    }
                    res = await sfile.pump(file.source.buffer);
                    break;
                default:
                    throw new TypeError('Unrecognized FileTableEntry type in SBAsset6.save');
            }
            filetable.push({
                path: file.virtualPath,
                offset: new int64_buffer_1.Uint64BE(res.offset),
                filelength: new int64_buffer_1.Uint64BE(res.wrote)
            });
        }
        this.progress.emit('save.metatable', { message: 'Writing archive metatable' });
        const metatablePosition = new int64_buffer_1.Uint64BE(newFile.position);
        await sfile.pump(await SBAsset6._buildMetatable(this.metadata, filetable));
        if (!newFile.fd) {
            throw new Error('File descriptor for destination archive closed before saving completed.');
        }
        // metatable position should always be a Uint64BE found at 0x00000008
        await fs.write(newFile.fd, metatablePosition.toBuffer(), 0, 8, 8);
        await newFile.close();
        await this.close();
        this.progress.emit('save.done', { message: 'Saving archive file complete' });
        await fs.move(this.path + '.tmp', this.path, { overwrite: true });
        return this.load();
    }
}
exports.SBAsset6 = SBAsset6;
//# sourceMappingURL=SBAsset6.js.map