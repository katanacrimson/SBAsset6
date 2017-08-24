# SBAsset6

SBAsset6 is a class which abstracts and provides a solid library for parsing and working with SBAsset6 formatted archive files
 (otherwise known as Starbound .pak files).

All methods are async functions that return promises. This entire library depends on async/await and thus requires node 7.6+.

## Usage

``` js
const { SBAsset6 }  = require('SBAsset6')

// you can work with it like normal promises...
const filepath = '/path/to/mod.pak'
let pak = new SBAsset6(filepath)

pak.load().then((metatable) => {
	const { metadata, files } = metatable

	// files contains the list of files
	// metadata contains the JS Object representing the _metadata file contents
})

// or, with async/await...
// ...

let pak = new SBAsset6(filepath)

const readPak = async (pak) => {
	const { metadata, files } = await pak.load()

	// same as above about metadata and files...
	let fileContents = await pak.getFile('/path/inside/of/pak/to/file.config')
	// note, this file should exist within the files array above
}
readPak(pak)
```

## Methods

### new SBAsset6(path)

SBAsset6 Constructor

* @param  {String} path - The filepath for the archive we're going to work with.
* @return {SBAsset6}

See usage above.

### SBAsset6.load()

Loads the archive, parses everything out and then provides access to the archive files and metadata.
This is a convenience method for the common workflow of loading the archive.

* @return {Promise:object} - An object containing the metadata and all files contained in the archive that can be read out.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	const { metadata, files } = await pak.load()
	// you know have access to metadata and files. yay!
}
```

### SBAsset6.getFile(filename)

Get a specific file from the archive.

* @param  {String} filename - The path to the file inside the archive that we want.
* @return {Promise:String} - The contents of the file we want to fetch.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6()
	const { metadata, files } = await pak.load()
	// gotta load metatable before we can get files...

	const modFileInPak = '/file/inside/pak.config'
	const fileContents = await pak.getFile(modFileInPak)
}
```