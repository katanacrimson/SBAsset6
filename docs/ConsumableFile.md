# ConsumableFile

ConsumableFile is a class designed to, like ConsumableBuffer, wrap around node.js file descriptors to allow for more fluid seeking/reading capabilities,
 moving logic out of the way of interacting with data.  Give it a filepath, call read and it will simply advance through the file as you read.

All methods are async functions that return promises. This entire library depends on async/await and thus requires node 7.6+.

## Usage

``` js
const { ConsumableFile }  = require('SBAsset6')

// you can work with it like normal promises...
const filepath = '/path/to/file.txt'
// (we'll assume that the above file contains "TEST FILE HERE")
let cbuf = new ConsumableFile(filepath)

cbuf.read(4).then((rdBuffer) => {
	// mind - rdBuffer is a Buffer!
	console.log(rdBuffer.toString()) // outputs "TEST"
})

// or, with async/await...
// ...

cbuf = new ConsumableFile(filepath)

const readFile = async (cbuf) => {
	await cbuf.reset()
	// cbuf.reset() here resets stream back to "original" state we received it in
	await cbuf.seek(6)
	// skips forward 6 bytes. NOT CHARACTERS, BYTES!
	let rdBuffer = await cbuf.read(4)
	// reads the next 4 bytes and returns a promise - await lets it resolve before storing into rdBuffer
	console.log(rdBuffer.toString()) // and this also oututs "TEST"
}
readFile(cbuf)
```

## Methods

### new ConsumableFile(String)

ConsumableFile constructor

* @param  {String} path - Path to the file that we're going to be "consuming".
* @return {ConsumableFile}

See usage above.

### ConsumableFile.open()

Opens the file for reading based off of the path provided to the constructor.
Must occur before reading/seeking within the file.

* @return {Promise:undefined} - Returns undefined.

``` js
async () => {
	const filepath = '/path/to/file.txt'
	const cbuf = new ConsumableFile(filepath)
	await cbuf.open()
	// now able to read from cbuf!
}
```

### ConsumableFile.close()

Closes the file, preventing future reading.

* @return {Promise:undefined} - Returns undefined.

**NOTE:**: Should be called when done with the file.  Don't hog file handles, people.

``` js
async () => {
	const filepath = '/path/to/file.txt'
	const cbuf = new ConsumableFile(filepath)
	await cbuf.open()
	// now able to read from cbuf!

	// ...

	await cbuf.close()
	// no longer able to read from cbuf, state is reset and clean.
}
```

### ConsumableFile.read(bytes)

Reads within the file.

* @param  {Number} bytes - The number of bytes to read and advance within the buffer.
* @return {Promise:Buffer}  - Returns a buffer containing the next selected bytes from the ConsumableFile.

``` js
async () => {
	const filepath = '/path/to/file.txt'
	const cbuf = new ConsumableFile(filepath)
	await cbuf.open()

	const readBuffer = await cbuf.read(2)

	// readBuffer would equal <Buffer 54 45>

	await cbuf.close()
}
```

### ConsumableFile.seek(bytes)

Seeks within the file to reposition for read, relative to the current position.

* @param  {Number} bytes - The number of bytes to shift within the buffer; this can be negative.
* @return {Promise:undefined} - Returns undefined.

``` js
async () => {
	const filepath = '/path/to/file.txt'
	const cbuf = new ConsumableFile(filepath)
	await cbuf.open()
	await cbuf.seek(1)

	// next read or seek will start one character over, so if we did...
	const readBuffer = await cbuf.read(1)
	// ...it would equal <Buffer 45>

	await cbuf.close()
}
```

### ConsumableFile.aseek(bytes)

Seeks within the file to reposition for read, using an absolute position.

* @param  {Number} bytes - How many bytes into the file do we want to seek?
* @return {Promise:undefined} - Returns undefined.

``` js
async () => {
	const filepath = '/path/to/file.txt'
	const cbuf = new ConsumableFile(filepath)
	await cbuf.open()
	await cbuf.aseek(1)

	// next read or seek will start where we aseek()'d to, so if we did...
	let readBuffer = await cbuf.read(1)
	// ...it would equal <Buffer 45>

	// and if we aseek()'d to 1 again...
	await cbuf.aseek(1)
	// and read one byte...
	readBuffer = await cbuf.read(1)
	// we'd still get the same thing - <Buffer 45>

	await cbuf.close()
}
```