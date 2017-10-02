# FileMapper

FileMapper is ahelper class which abstracts and provides a solid mechanism for working with "files" contained within SBAsset6 archives.

Instances of FileMapper are created, populated, and managed by SBAsset6.
There's no need to individually create FileMapper instances; just work with what the SBAsset6 instance provides you.

**NOTE:** For changes to be made effective, you need to save the SBAsset6 archive.

All methods are async functions that return promises. This entire library depends on async/await and thus requires node 7.6+.

## Usage

``` js
const SBAsset6  = require('SBAsset6')

// you can work with it like normal promises...
const filepath = '/path/to/mod.pak'
let pak = new SBAsset6(filepath)

pak.load()
	.then(() => {
		return pak.files.list()
	})
	.then((files) => {
		// work with our list of files...
	})


// or, with async/await...
// ...

let pak = new SBAsset6(filepath)

const readPak = async (pak) => {
	await pak.load()

	const files = await pak.files.list()
	const fileContent = await pak.files.getFile('/path/to/file/that/exists/in/pak.txt')
	// and so on
}
readPak(pak)
```

## Methods

### FileMapper.list()

Lists all "files" mapped in the FileMapper.

* @return {Promise:Array} - Array of virtual filepaths that are currently registered within the FileMapper.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	await pak.load()
	const files = await pak.files.list()
}
```

### FileMapper.exists(virtualPath)

Identifies if a "file" exists at the specified virtualPath.

* @param  {String} virtualPath - The virtualPath to check for existence.
* @return {Promise:Boolean}

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	await pak.load()

	const fileExists = await pak.files.exists('/path/to/file/inside/pak.txt')
	if(fileExists) {
		// ...
	}
}
```

### FileMapper.getFile(virtualPath)

Gets the contents of the "file" at the specified virtualPath.

* @param  {String} virtualPath - The virtualPath to load the "file" from.
* @return {Promise:Buffer} - The "file" contents, as a Buffer instance.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	await pak.load()

	const fileContents = await pak.files.getFile('/path/to/file/inside/pak.txt')
}
```

### FileMapper.setFile(virtualPath, options)

Set file metadata for the given filepath.
  This does NOT merge with previous properties, so specify everything (including old) at once.

* @param {String} virtualPath - The virtualPath to set file metadata for.
* @param {Object} options - The metadata to set.
* @return {Promise:undefined}

#### FileMapper.setFile options

* `options.pak` - if defined, should be an instance of `SBAsset6`. `options.start` and `options.fileLength` **MUST** also be specified if this is used.
* `options.fd` - if defined, should be a file descriptor. Note that if a file descriptor is provided, it **WILL NOT** be closed after use; that becomes your responsibility.
* `options.path` - if defined, should be a filepath.
* `options.buffer` - if defined, should be a Buffer instance. `options.start` and `options.fileLength` will be ignored.
* `options.start` - Where, within the given source (pak, fd, or path) to start reading when creating the "file" within the SBAsset6 archive.
* `options.fileLength` - How much to read from the given source (pak, fd, or path) when creating the "file" within the SBAsset6 archive.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	await pak.load()

	const fileContents = await pak.files.getFile('/path/to/file/inside/pak.txt')
	await pak.files.setFile('/path/to/file/inside/pak.txt', { path: '/samples/file.txt' })
	// note: use of Date.now() below would make the build non-reproducible.
	//   try to avoid this, in reality!  it's just an example for now.
	const buildMeta = Buffer.from(JSON.stringify({
		buildTool: 'js-starbound/SBAsset6/2.0.0',
		buildTime: Date.now()
	}))
	await pak.files.setFile('/buildinfo.json', { buffer: buildMeta })

	// gotta save our changes now!
	return pak.save()
}
```

### FileMapper.deleteFile(virtualPath)

Delete a specified "file" from the archive.
Simply removes the metadata entry; it will just be excluded when the new archive is built.

* @param  {String} virtualPath - The virtualPath of the file to delete.
* @return {Promise:undefined}

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	await pak.load()

	await pak.files.deleteFile('/path/to/file/inside/pak.txt')

	// save our changes. we never wanted that file in there anyways!
	return pak.save()
}
```
