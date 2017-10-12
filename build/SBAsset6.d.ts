/// <reference types="node" />
import { EventEmitter } from 'events';
import { Uint64BE } from 'int64-buffer';
import { ConsumableBuffer } from 'ConsumableBuffer';
import { ConsumableFile } from 'ConsumableFile';
import { FileMapper } from './FileMapper';
export interface LoadResult {
    metadata: {
        [index: string]: any;
    };
    files: Array<string>;
}
export interface Metatable {
    metadata: {
        [index: string]: any;
    };
    filetable: Array<FileTableEntry>;
}
export interface FileTableEntry {
    path: string;
    offset: Uint64BE;
    filelength: Uint64BE;
}
export declare class SBAsset6 {
    path: string;
    file: ConsumableFile | undefined;
    metatablePosition: Uint64BE | undefined;
    metadata: {
        [index: string]: any;
    };
    files: FileMapper;
    progress: EventEmitter;
    /**
     * SBAsset6 Constructor
     *
     * @param  {String} path - The filepath for the archive we're going to work with.
     * @return {SBAsset6}
     */
    constructor(path: string);
    /**
     * Reads the header of a file and identifies if it is SBAsset6 format.
     * @access private
     *
     * @param {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
     * @return {Promise:Uint64BE} - A Big-endian Uint64 value containing the file offset for the archive metatable.
     */
    static _readHeader(sbuf: ConsumableBuffer | ConsumableFile): Promise<Uint64BE>;
    /**
     * Reads the metatable, given the correct position, and parses out the filetable and archive metadata.
     * @access private
     *
     * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
     * @param  {Uint64BE} metatablePosition - The Uint64BE containing the metatable location within the archive.
     * @return {Promise:Object} - An Object that contains the metadata and filetable of the archive.
     */
    static _readMetatable(sbuf: ConsumableBuffer | ConsumableFile, metatablePosition: Uint64BE): Promise<Metatable>;
    /**
     * Gets a file of specified length from a specific offset within the archive.
     *
     * @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
     * @param  {Uint64BE} offset - Offset in bytes of the file's location in the archive.
     * @param  {Uint64BE} filelength - Length in bytes for the file.
     * @return {Promise:Buffer} - The buffer containing the contents of the specified file.
     */
    static _getFile(sbuf: ConsumableBuffer | ConsumableFile, offset: Uint64BE, filelength: Uint64BE): Promise<Buffer>;
    /**
     * Builds the metatable used for SBAsset6 archives.
     *
     * @param  {Object} metadata - The object containing the metadata for the SBasset6 archive.
     * @param  {Array} filetable - Array of objects representing the filetable.
     *   Each entry should contain a virtual path, a Uint64BE instance for an offset, and a Uint64BE instance of a filelength.
     * @return {Promise:Buffer} - The Buffer instance containing the exact SBAsset6 archive.
     */
    static _buildMetatable(metadata: {
        [index: string]: any;
    }, filetable: Array<FileTableEntry>): Promise<Buffer>;
    /**
     * Loads the archive, parses everything out and then provides access to the archive files and metadata.
     * This is a convenience method for the common workflow of loading the archive.
     *
     * @return {Promise:Object} - An object containing the archive's metadata and all files contained in the archive that can be read out.
     */
    load(): Promise<LoadResult>;
    /**
     * Close the SBAsset6 archive and flush everything from memory.
     * Does not save changes!
     *
     * @return {Promise:void}
     */
    close(): Promise<void>;
    /**
     * Get whether or not the pak itself has been "loaded" from the filesystem.
     * Instances that are *going* to be created will be considered "unloaded" as no original pak exists.
     *
     * @return {Promise:Boolean}
     */
    isLoaded(): Promise<boolean>;
    /**
     * Gets a specific chunk of data from the pak file we're working with.
     *
     * @private
     * @param  {Uint64BE} offset - How far into the pak to seek to.
     * @param  {Uint64BE} size - The amount of data to fetch.
     * @return {Promise:Buffer} - The data we're looking for.
     */
    getPakData(offset: Uint64BE, size: Uint64BE): Promise<Buffer>;
    /**
     * Save the currently generated SBAsset6 archive.
     * Reloads the archive and rebuilds the FileMapper when saving is complete.
     *
     * @return {Promise:Object} - An object containing the archive's metadata and all files contained in the archive that can be read out.
     */
    save(): Promise<LoadResult>;
}
