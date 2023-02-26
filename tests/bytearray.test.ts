import { expect } from 'chai'
import { Bytes32, Bytes48, Bytes96 } from '../src/primitives/bytearray.js'

describe('invariant', () => {
    it('fromBytes', () => {
        for (let i = 0; i < 100; i++) {
            let arr = new Uint8Array(i).fill(i)

            let bytes32Err = Bytes32.fromBytes(arr)
            let bytes48Err = Bytes48.fromBytes(arr)
            let bytes96Err = Bytes96.fromBytes(arr)

            if (Bytes32.NUMBER_OF_BYTES != i) {
                expect(bytes32Err).is.instanceOf(Error)
            }
            if (Bytes48.NUMBER_OF_BYTES != i) {
                expect(bytes48Err).is.instanceOf(Error)
            }
            if (Bytes96.NUMBER_OF_BYTES != i) {
                expect(bytes96Err).is.instanceOf(Error)
            }
        }
    })
})