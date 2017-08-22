# ConsumableBuffer

ConsumableBuffer is a class designed to wrap around node.js buffers to allow for more fluid seeking/reading capabilities,
 moving logic out of the way of interacting with data.  Give it a buffer, call read and it will simply advance through that buffer as you read.

All methods are async functions that return promises. This entire library depends on async/await and thus requires node 7.6+.

## Usage

``` js
const { ConsumableBuffer }  = require('SBAsset6')

// you can work with it like normal promises...
const myBuffer = Buffer.from('TEST BUFFER HERE')
let cbuf = new ConsumableBuffer(myBuffer)

cbuf.read(4).then((rdBuffer) => {
	// mind - rdBuffer is a Buffer!
	console.log(rdBuffer.toString()) // outputs "TEST"
})

// or, with async/await...
// ...

const myOtherBuffer = Buffer.from('SUPER TEST BUFFER HERE')
cbuf = new ConsumableBuffer(myOtherBuffer)

const readBuffer = async (cbuf) => {
	await cbuf.reset()
	// cbuf.reset() here resets stream back to "original" state we received it in
	await cbuf.seek(6)
	// skips forward 6 bytes. NOT CHARACTERS, BYTES!
	let rdBuffer = await cbuf.read(4)
	// reads the next 4 bytes and returns a promise - await lets it resolve before storing into rdBuffer
	console.log(rdBuffer.toString()) // and this also oututs "TEST"
}
readBuffer(cbuf)
```

## Methods

### new ConsumableBuffer(Buffer)

ConsumableBuffer constructor

* @param  {Buffer} buf - Starting buffer that we want to work with.
* @return {ConsumableBuffer}

See usage above.

### ConsumableBuffer.reset()

Resets the returned "buffer" to the original one previously passed in.

* @return {Promise:Buffer} - returns the full buffer originally passed in.

``` js
async () => {
	const myBuffer = Buffer.from('TEST')
	const cbuf = new ConsumableBuffer(myBuffer)
	const resetBuffer = await cbuf.reset()

	// myBuffer and resetBuffer possess the exact same contents
}
```

### ConsumableBuffer.read(bytes)

Reads and "consumes" the buffer, returning everything read and advancing through the buffer with each read call.
Read buffer contents will not be available for read again unless the ConsumableBuffer is reset.

* @param  {Number} - The number of bytes to read and advance within the buffer.
* @return {Promise:Buffer} - Returns a buffer containing the next selected bytes from the ConsumableBuffer.

``` js
	const myBuffer = Buffer.from('TEST')
	const cbuf = new ConsumableBuffer(myBuffer)
	const readBuffer = await cbuf.read(2)

	// readBuffer would equal <Buffer 54 45>
```

### ConsumableBuffer.seek(bytes)

Seeks ahead a number of bytes in the current buffer.
This WILL NOT seek backwards - use `ConsumableBuffer.reset()`!

* @param  {Number} - The number of bytes to advance within the buffer.
* @return {Promise:undefined} - Returns undefined.

``` js
	const myBuffer = Buffer.from('TEST')
	const cbuf = new ConsumableBuffer(myBuffer)
	await cbuf.seek(1)

	// next read or seek will start one character over, so if we did...
	const readBuffer = await cbuf.read(1)
	// ...it would equal <Buffer 45>
```

### ConsumableBuffer.aseek(bytes)

Seeks absolutely within the *original* buffer.
Provided for compatibility with ConsumableFile.
This is just a shortcut method for `ConsumableBuffer.reset()` && `ConsumableBuffer.seek(bytes)`.

* @param  {Number} - How many bytes into the original buffer do we want to seek?
* @return {Promise:undefined} - Returns nothing.

``` js
	const myBuffer = Buffer.from('TEST')
	const cbuf = new ConsumableBuffer(myBuffer)
	await cbuf.aseek(1)

	// next read or seek will start where we aseek()'d to, so if we did...
	let readBuffer = await cbuf.read(1)
	// ...it would equal <Buffer 45>

	// and if we aseek()'d to 1 again...
	await cbuf.aseek(1)
	// and read one byte...
	readBuffer = await cbuf.read(1)
	// we'd still get the same thing - <Buffer 45>
```

### ConsumableBuffer.getCurrentBuffer()

Gets the current working buffer we're drawing from for future reads/seeks.

* @return {Promise:Buffer}

``` js
	const myBuffer = Buffer.from('TEST')
	const cbuf = new ConsumableBuffer(myBuffer)
	await cbuf.seek(2)
	const currentBuffer = await cbuf.getCurrentBuffer()
	// currentBuffer would equal <Buffer 53 54>
```
