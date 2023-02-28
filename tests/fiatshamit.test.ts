import { expect } from "chai"
import { computeChallenge, computePowers } from '../src/fiatshamir.js'
import { Scalar, G1Point, Blob } from "../src/primitives/index.js"
import { assertArrEqual, assertScalarEqual } from "./utils.test.js"

describe('computePowers', () => {
    it('n=0 edge case', () => {
        let powers = computePowers(Scalar.one(), 0)
        expect(powers.length).to.equal(0)
    })
    it('smoke test', () => {
        let two = Scalar.fromBigIntReduce(2n);

        let powers = computePowers(two, 4);

        // The zeroth power should be 1; 2^0
        assertScalarEqual(powers[0], Scalar.one())

        // The first power should be two; 2^1 
        assertScalarEqual(powers[1], two)

        // The second power should be two; 2^2
        let two_squared = Scalar.mul(two, two)
        assertScalarEqual(powers[2], two_squared)

        // The third and last power should be two; 2^3
        let two_cubed = Scalar.mul(two_squared, two)
        assertScalarEqual(powers[3], two_cubed)
    })
})

describe('ComputeChallenge', () => {
    it('regression/interop test -- zero blob, zero point', () => {
        // These test vectors were generated in the gnark implementation
        let expected = new Uint8Array([
            59, 127, 233, 79, 178, 22, 242, 95,
            176, 209, 125, 10, 193, 90, 102, 229,
            56, 104, 204, 58, 237, 60, 121, 97,
            77, 194, 248, 45, 172, 7, 224, 74
        ]);
        let blobError = Blob.fromBytes(new Uint8Array(Blob.NUMBER_OF_BYTES))
        if (blobError instanceof Error) throw blobError;
        let blob = blobError as Blob;

        let serializedPoint = G1Point.identity().toBytes48()
        let challenge = computeChallenge(blob, serializedPoint)
        assertArrEqual(challenge.toBytes(), expected)
    })
})
