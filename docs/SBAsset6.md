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

### SBAsset6.progress

An EventEmitter instance that emits specific events during the saving and loading process to allow for more observability when unpacking or packing large files.

## Methods

### new SBAsset6(path)

SBAsset6 Constructor

* @param  {String} path - The filepath for the archive we're going to work with.
* @return {SBAsset6}

See usage above.

### SBAsset6.load()

Loads the archive, parses everything out and then provides access to the archive files and metadata.
This is a convenience method for the common workflow of loading the archive.

* @return {Promise:Object} - An object containing the archive's metadata and all files contained in the archive that can be read out.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	const { metadata, files } = await pak.load()
	// you know have access to metadata and files. yay!
}
```

#### SBAsset6.progress events emitted

For all, `message` describes the event.

* `load.start` - `{ message, target }` - `target` is the archive we're trying to load.
* `load.header` - `{ message }`
* `load.metatable` - `{ message }`
* `load.files` - `{ message, total }` - `total` is the total number of files found in the archive.
* `load.file.progress` - `{ message, target, index }` - `target` is the virtualPath the file whose metadata we're loading into the FileMapper,
and `index` tells us how many files in we are (X, where "File X of Y").
* `load.done` - `{ message }`

### SBAsset6.close()

Close the SBAsset6 archive and flush everything from memory.
Does not save changes!

* @return {Promise:undefined}

**NOTE:** Should be called when done with the archive.  Don't hog file handles, people.

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

#### SBAsset6.progress events emitted

For all, `message` describes the event.

* `close` - `{ message }`

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

### SBAsset6.save()

Save the currently generated SBAsset6 archive.
Reloads the archive and rebuilds the FileMapper instance when saving is complete.

* @return {Promise:Object} - An object containing the archive's metadata and all files contained in the archive that can be read out.

``` js
async () => {
	const filepath = '/path/to/mod.pak'
	const pak = new SBAsset6(filepath)
	await pak.load()

	// This pak's description was too long. Let's change it.
	pak.metadata.description = 'Shorter description.'

	// Need to save our changes now...
	return pak.save()
}
```

#### SBAsset6.progress events emitted

For all, `message` describes the event.

* `save.start` - `{ message, target }` - `target` is the archive we're trying to save to.
* `save.header` - `{ message }`
* `save.files` - `{ message, total }` - `total` is the total number of files being written to the archive.
* `save.file.progress` - `{ message, target, index }` - `target` is the virtualPath the file that we're writing to the archive,
and `index` tells us how many files in we are (X, where "File X of Y").
* `save.metatable` - `{ message }`
* `save.done` - `{ message }`
