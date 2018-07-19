# SBAsset6

## A node.js library for parsing SBAsset6-formatted files

### What is SBAsset6?

SBAsset6 is a format used by the game Starbound for packaging together game/mod assets.
It appears to be specific to Starbound for the time being, though that may change in the future.

This library was developed to parse and read these files in Javascript; it is based off of the work done by blixt in the excellent [py-starbound](https://github.com/blixt/py-starbound) library.

Please note that this library requires async/await and is heavily promise-driven.  Node 7.6+ is **required**.

### Where is SBAsset6 documented?

Some reverse-engineering documentation is available in the [blixt/py-starbound](https://github.com/blixt/py-starbound/blob/master/FORMATS.md) repository.

### How do I install this library?

Ensure you have at least node.js v7.6+, and then...

``` bash
$ yarn add https://github.com/damianb/SBAsset6.git
```

### How do I use this library?

In brief:

``` js
'use strict'
const SBAsset6 = require('SBAsset6')

const pak = new SBAsset6('/path/to/pak/file.pak')
pak.load().then(async () => {
	console.dir(pak.files)
	// ^ gives you an array of all the files in the archive

	console.dir(pak.metadata)
	// ^ gives you the metadata about the pak itself (basically, the _metadata file)

	let fileContents = await pak.getFile('/path/in/pak/to/filename.config')
	// ^ gives you the contents of the specified file in the pak
})

```

Full library documentation is available in the repository under the /docs/ directory.
