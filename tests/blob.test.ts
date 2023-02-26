import { expect } from 'chai'
import { SERIALIZED_SCALAR_SIZE } from '../src/constants.js'
import { Blob } from '../src/primitives/blob.js'

describe('blob - invariant', () => {
    it('fromBytes', () => {

        let arr = new Uint8Array(Blob.NUMBER_OF_BYTES).fill(1234)
        let blobErr = Blob.fromBytes(arr)
        expect(blobErr).is.not.instanceOf(Error)
        let blob = blobErr as Blob;

        let chunks = blob.toChunks()
        expect(chunks.length).to.equal(Blob.NUMBER_OF_BYTES / SERIALIZED_SCALAR_SIZE)

    })
})