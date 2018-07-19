/// <reference types="node" />
import { Uint64BE } from 'int64-buffer';
import { SBAsset6 } from './SBAsset6';
/**
 * Abstracts the input structure necessary for FileMapper.setFile()
 */
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
/**
 * Abstracts the internal structure of a filetable entry.
 *
 * @private
 * @hidden
 */
export interface FileMapperEntry extends FileTableInput {
    type: string;
    virtualPath: string;
}
export declare class FileMapper {
    /**
     * Storage for all virtual file mapping data for the SBAsset6 archive.
     *
     * @private
     */
    private filetable;
    /**
     * FileMapper is a class which provides an abstraction around SBAsset6 file tables for sensibly managing files contained within the archive.
     *
     * @return {FileMapper}
     *
     * @example
     * ```
     * import { SBAsset6 } from 'SBAsset6'
     * const filepath = '/path/to/mod.pak'
     *
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     * let files = await pak.files.list()
     * ```
     */
    constructor();
    /**
     * Lists all "files" mapped in the FileMapper.
     *
     * @return {Promise<string[]>} - Array of virtual filepaths that are currently registered within the FileMapper.
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     *
     * const files = await pak.files.list()
     * ```
     */
    list(): Promise<string[]>;
    /**
     * Identifies if a "file" exists at the specified virtualPath.
     *
     * @param  virtualPath - The virtualPath to check for existence.
     * @return {Promise<boolean>}
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     *
     * const fileExists = await pak.files.exists('/path/to/file/inside/pak.txt')
     * if(fileExists) {
     *   // ...
     * }
     * ```
     */
    exists(virtualPath: string): Promise<boolean>;
    /**
     * Gets the contents of the "file" at the specified virtualPath.
     *
     * @param  virtualPath - The virtualPath to load the "file" from.
     * @return {Promise<Buffer>} - The "file" contents, as a Buffer instance.
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     *
     * const fileContents = await pak.files.getFile('/path/to/file/inside/pak.txt')
     * ```
     */
    getFile(virtualPath: string): Promise<Buffer>;
    /**
     * Set file metadata for the given filepath.
     *   This does NOT merge with previous properties, so specify everything (including old) at once.
     *
     * @param virtualPath - The virtualPath to set file metadata for.
     * @param options - The metadata to set.
     * @return {Promise<void>}
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     *
     * const fileContents = await pak.files.getFile('/path/to/file/inside/pak.txt')
     * await pak.files.setFile('/path/to/file/inside/pak.txt', { path: '/samples/file.txt' })
     * // note: use of Date.now() below would make the build non-reproducible.
     * //   try to avoid this, in reality!  it's just an example for now.
     * const buildMeta = Buffer.from(JSON.stringify({
     *   buildTool: 'js-starbound/SBAsset6/2.0.0',
     *   buildTime: Date.now()
     * }))
     * await pak.files.setFile('/buildinfo.json', { buffer: buildMeta })
     *
     * // gotta save our changes now!
     * await pak.save()
     * ```
     */
    setFile(virtualPath: string, options: FileTableInput): Promise<void>;
    /**
     * Delete a specified "file" from the archive.
     * Simply removes the metadata entry; it will just be excluded when the new archive is built.
     *
     * @param  virtualPath - The virtualPath of the file to delete.
     * @return {Promise<void>}
     *
     * @example
     * ```
     * const filepath = '/path/to/mod.pak'
     * const pak = new SBAsset6(filepath)
     * await pak.load()
     *
     * await pak.files.deleteFile('/path/to/file/inside/pak.txt')
     *
     * // save our changes. we never wanted that file in there anyways!
     * await pak.save()
     * ```
     */
    deleteFile(virtualPath: string): Promise<void>;
    /**
     * Get the "file" metadata for the specified filepath (basically, where to load the file from).
     *
     * @private
     * @hidden
     *
     * @param  virtualPath - The virtualPath to get metadata for.
     * @return {Promise<FileMapperEntry>} - File metadata for loading.
     */
    getFileMeta(virtualPath: string): Promise<FileMapperEntry>;
}
