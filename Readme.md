# JS Proto Danksharding

This is a pure* typescript version of EIP4844.

## Benchmarks

You can run the benchmarks using `npm run benchmarks`.

As a reference point, verifying a KZG proof will take around 57ms with this library.

## Exceptions

Internally the library will only throw on bugs, so we return `T | Error` a lot. At the API level, the library will throw as this is common in libraries.

## API

The API is a bytes array API, so a user should not need to rely on any types defined in this library.

## Installation

```
npm install @crate-crypto/crate-4844
```

## Example usage

```ts
// Taken from tests/index.test.ts
import { Context } from "../src/index.js"

let context = new Context()
let blob = ...
let { proof, commitment } = context.computeBlobKZGProf(blob)
let result = context.verifyBlobKZGProof(blob, commitment, proof)
expect(result).to.be.true
```

