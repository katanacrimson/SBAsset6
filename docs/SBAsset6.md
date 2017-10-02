# SBAsset6

SBAsset6 is a class which abstracts and provides a solid library for parsing and working with SBAsset6 formatted archive files
 (otherwise known as Starbound .pak files).

All methods are async functions that return promises. This entire library depends on async/await and thus requires node 7.6+.

## Usage

``` js
const SBAsset6  = require('SBAsset6')

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

## Properties

### SBAsset6.metadata

An Object containing all metadata relevant to the archive - this is normally stored in a \_metadata file then parsed out when packing the mod.

### SBAsset6.files

A FileMapper instance that abstracts out the files in the archive.

See the FileMapper documentation for more information.

## Methods

### new SBAsset6(path)

SBAsset6 Constructor

* @param  {String} path - The filepath for the archive we're going to work with.
* @return {SBAsset6}

See usage above.

### SBAsset6.load()

Loads the archive, parses everything out and then provides access to the archive files and metadata.
This is a convenience method for the common workflow of loading the archive.

* @return {Promise:Object} - An object containing the metadata and all files contained in the archive that can be read out.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	const { metadata, files } = await pak.load()
	// you know have access to metadata and files. yay!
}
```

### SBAsset6.close()

Close the SBAsset6 archive and flush everything from memory.
Does not save changes!

* @return {Promise:undefined}

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	const { metadata, files } = await pak.load()
	// you know have access to metadata and files. yay!

	// ...

	// all done here. time to clean up and release resources.

	await pak.close()
}
```

### SBAsset6.isLoaded()

Get whether or not the pak itself has been "loaded" from the filesystem.
Instances that are *going* to be created will be considered "unloaded" as no original pak exists.

* @return {Promise:Boolean}

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	const { metadata, files } = await pak.load()
	// you know have access to metadata and files. yay!

	// ...

	// wait, did we load the pak earlier? has it been closed since? let's check...
	const isOpen = await pak.isLoaded()
}
```
