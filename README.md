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
$ yarn add sbasset6
```

### How do I use this library?

Reference the [documentation](https://damianb.github.io/SBAsset6/).
