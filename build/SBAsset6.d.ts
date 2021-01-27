/// <reference types="node" />
import { EventEmitter } from 'events';
import { Uint64BE } from 'int64-buffer';
import { ConsumableFile, ConsumableResource } from 'byteaccordion';
import { FileMapper } from './FileMapper';
/**
 * Abstracts the result of loading an SBAsset6 archive.
 */
export interface LoadResult {
    /**
     * The metadata for the SBAsset6 archive, represented as a JS Object (basically equivalent to JSON obj).
     */
    metadata: {
        [index: string]: any;
    };
    /**
     * Collection of virtual paths of all files stored within the SBAsset6 archive.
     */
    files: string[];
}
/**
 * Abstracts the rough structure of the metatable of an SBAsset6 archive.
 *
 * @private
 * @hidden
 */
export interface Metatable {
    /**
     * The metadata for the SBAsset6 archive, represented as a JS Object (basically equivalent to JSON obj).
     */
    metadata: {
        [index: string]: any;
    };
    /**
     * Collection of filetable entries, comprising of all stored files within the SBAsset6 archive.
     */
    filetable: FileTableEntry[];
}
/**
 * Abstracts a single SBAsset6 filetable entry.
 *
 * @private
 * @hidden
 */
export interface FileTableEntry {
    /**
     * The virtualpath for the given filetable entry.
     */
    path: string;
    /**
     * The offset where the filetable entry's content starts (within the SBAsset6 archive, in bytes)
     */
    offset: Uint64BE;
    /**
     * The length of the filetable entry's content (within the SBAsset6 archive, in bytes)
     */
    filelength: Uint64BE;
}
export declare class SBAsset6 {
    /**
     * The path to the SBAsset6-encoded archive file.
     *
     * @private
     * @hidden
     */
    path: string;
    /**
     * The ConsumableFile instance for the SBAsset6 archive.
     *
     * @private
     * @hidden
     */
    file: ConsumableFile | undefined;
    /**
     * The offset of the metatable inside the SBAsset6 archive.
     *
     * @private
     * @hidden
     */
    metatablePosition: Uint64BE | undefined;
    /**
     * The metadata for the SBAsset6 archive.
     * This is a Javascript object representation of the metadata file documented on the [Starbounder wiki](https://starbounder.org/Modding:Metadata_file).
     */
    metadata: {
        [index: string]: any;
    };
    /**
     * The FileMapper instance handling the files contained (or that will be contained) within the SBAsset6 archive.
     */
    files: FileMapper;
    /**
     * An EventEmitter that emits special progress events during the SBAsset6 loading and saving process.
     */
    progress: EventEmitter;
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
    constructor(path: string);
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
    static _readHeader(sbuf: ConsumableResource): Promise<Uint64BE>;
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
    static _readMetatable(sbuf: ConsumableResource, metatablePosition: Uint64BE): Promise<Metatable>;
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
    static _getFile(sbuf: ConsumableResource, offset: Uint64BE, filelength: Uint64BE): Promise<Buffer>;
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
    static _buildMetatable(metadata: {
        [index: string]: any;
    }, filetable: FileTableEntry[]): Promise<Buffer>;
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
    load(): Promise<LoadResult>;
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
    close(): Promise<void>;
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
    isLoaded(): Promise<boolean>;
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
    getPakData(offset: Uint64BE, size: Uint64BE): Promise<Buffer>;
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
    save(): Promise<LoadResult>;
}
