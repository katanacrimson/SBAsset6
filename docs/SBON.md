# SBON

SBON is a class of static methods which handles parsing the proprietary SBON format, which is heavily used within Starbound archives and other files.

All methods are async functions that return promises. This entire library depends on async/await and thus requires node 7.6+.

As this library is heavily dependant on byte-level work and interpretation, it's highly recommended to first thoroughly review
  [the reverse engineering document](https://github.com/blixt/py-starbound/blob/master/FORMATS.md) and then review the source code for this SBON class itself.

## Methods

### (static) SBON.readVarInt(sbuf)

Reads a variable integer from the provided ConsumableBuffer or ConsumableFile.
Relies on bigInt for mathematical operations as we're performing mathematical operations beyond JS's native capabilities.

See also: [https://en.wikipedia.org/wiki/Variable-length_quantity](https://en.wikipedia.org/wiki/Variable-length_quantity)

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return {Number} - The javascript number form of the varint we just read.

### (static) SBON.readSignedVarInt(sbuf)

Reads a *signed* variable integer from the provided ConsumableBuffer or ConsumableFile.
Relies on bigInt for mathematical operations as we're performing mathematical operations beyond JS's native capabilities.

See also: [https://en.wikipedia.org/wiki/Variable-length_quantity](https://en.wikipedia.org/wiki/Variable-length_quantity)

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return {Number} - The javascript number form of the signed varint we just read.

### (static) SBON.readBytes(sbuf)

Reads a series of bytes from the provided ConsumableBuffer or ConsumableFile.
We expect that the first thing read will be a varint which will indicate how many bytes overall we will need to read.
This is commonly used for a UTF-8 string, with a varint indicating how many bytes will compose the string.

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return {Buffer} - A buffer instance containing the bytes read.

### (static) SBON.readString(sbuf)

Reads a series of bytes from the provided ConsumableBuffer or ConsumableFile and reencodes them into a string.
Most of the work here is done in readBytes - we just transform the Buffer here into a UTF-8 stream after it's gotten our bytes.

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return {String} - A UTF-8 string.

### (static) SBON.readDynamic(sbuf)

Reads a dynamic-typed chunk of data from the provided ConsumableBuffer or ConsumableFile.
Our first byte indicates the type, which then determines who will handle the rest.
This farms out to the other SBON functions as necessary.

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return mixed - Too many potential return types to document. You'll get something - can't really tell you what, though.

### (static) SBON.readList(sbuf)

Reads a list from the provided ConsumableBuffer or ConsumableFile.

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return {Array} - An Array used as a list.

### (static) SBON.readMap(sbuf)

Reads a map (which we use a generic Object to represent) from the provided ConsumableBuffer or ConsumableFile.

* @param  {ConsumableBuffer|ConsumableFile} sbuf - The stream to read from.
* @return {Object} - An Object used as a key-value map.