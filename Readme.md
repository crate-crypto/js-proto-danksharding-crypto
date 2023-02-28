# JS Proto Danksharding

This is a pure* typescript version of EIP4844. It is ESM compatible and the speed is
acceptable for web usage.  

*pure it uses WASM for one function.

## Exceptions

Currently the code does not throw unless it would indicate a bug. The effect of this is that 
many of the functions return `T | Error`. This means that the caller needs to explicitly check for errors and decide if they want to throw or not.

This decision was intentional, however if it is more conventional to throw, we can do this
at the API level.

## API

The API is still in flux, currently it takes in types like Bytes48 which can be created 
from a Uint8Array. It may be easier for the caller, if we have an API which is pure Uint8Array and we either throw and exception or return an error when we convert it to
fixed size types.

## Example usage

```ts
// Taken from tests/index.test.ts
import { Context } from "../src/index.js"

let context = new Context()
let blob = ...
let { proof, commitment } = assertNoErrorThrow(context.computeBlobKZGProf(blob))
let result = context.verifyBlobKZGProof(blob, commitment, proof)
expect(result).to.not.be.instanceOf(Error)
```
## Installation

TODO - upload to npm
