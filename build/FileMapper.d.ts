/// <reference types="node" />
import { Uint64BE } from 'int64-buffer';
import { SBAsset6 } from './SBAsset6';
export interface FileMapperEntry {
    type: string;
    virtualPath: string;
    source: {
        pak?: SBAsset6;
        path?: string;
        fd?: number;
        buffer?: Buffer;
    };
    start?: Uint64BE;
    filelength?: Uint64BE;
}
export interface FileTableInput {
    source: {
        pak?: SBAsset6;
        path?: string;
        fd?: number;
        buffer?: Buffer;
    };
    start?: Uint64BE;
    filelength?: Uint64BE;
}
export declare class FileMapper {
    filetable: {
        [index: string]: FileMapperEntry;
    };
    /**
     * FileMapper Constructor
     *
     * @return {FileMapper}
     */
    constructor();
    /**
     * Lists all "files" mapped in the FileMapper.
     *
     * @return {Promise:Array} - Array of virtual filepaths that are currently registered within the FileMapper.
     */
    list(): Promise<Array<string>>;
    /**
     * Identifies if a "file" exists at the specified virtualPath.
     *
     * @param  {String} virtualPath - The virtualPath to check for existence.
     * @return {Promise:Boolean}
     */
    exists(virtualPath: string): Promise<boolean>;
    /**
     * Get the "file" metadata for the specified filepath (basically, where to load the file from).
     *
     * @private
     * @param  {String} virtualPath - The virtualPath to get metadata for.
     * @return {Promise:Object} - File metadata for loading.
     */
    getFileMeta(virtualPath: string): Promise<FileMapperEntry>;
    /**
     * Gets the contents of the "file" at the specified virtualPath.
     *
     * @param  {String} virtualPath - The virtualPath to load the "file" from.
     * @return {Promise:Buffer} - The "file" contents, as a Buffer instance.
     */
    getFile(virtualPath: string): Promise<Buffer>;
    /**
     * Set file metadata for the given filepath.
     *   This does NOT merge with previous properties, so specify everything (including old) at once.
     *
     * @param {String} virtualPath - The virtualPath to set file metadata for.
     * @param {Object} options - The metadata to set.
     * @return {Promise:void}
     */
    setFile(virtualPath: string, options: FileTableInput): Promise<void>;
    /**
     * Delete a specified "file" from the archive.
     * Simply removes the metadata entry; it will just be excluded when the new archive is built.
     *
     * @param  {String} virtualPath - The virtualPath of the file to delete.
     * @return {Promise:void}
     */
    deleteFile(virtualPath: string): Promise<void>;
}
