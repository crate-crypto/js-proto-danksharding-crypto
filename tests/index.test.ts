import { expect } from "chai"
import { Context } from "../src/index.js"
import { randomPoly } from "./utils.test.js"
import { assertNoErrorThrow } from "../src/utils.js"
import { Scalar, G1Point } from "../src/primitives/index.js"

// This takes too long to initialize so we 
// initialize here. We could use a `before` 
// method and increase the timeOut for it
let context = new Context()

describe('compute/verify', () => {
    it('roundtrip - computeBlobKZGProf', () => {
        let seed = 123n
        let poly = randomPoly(seed)
        let blob = poly.toBlob().toBytes()
        let { proof, commitment } = assertNoErrorThrow(context.computeBlobKZGProf(blob))
        let result = context.verifyBlobKZGProof(blob, commitment, proof)
        expect(result).to.not.be.instanceOf(Error)

        result = context.verifyBlobKZGProof(blob, commitment, G1Point.identity().toBytes48().toBytes())
        expect(result).to.be.instanceOf(Error)
    })
    it('roundtrip - computeKZGProf', () => {
        let seed = 123n
        let poly = randomPoly(seed)
        let blob = poly.toBlob().toBytes()

        let inputPoint = Scalar.fromBigIntReduce(123456n).toBytes32().toBytes()

        let { proof, claimedValue } = assertNoErrorThrow(context.computeKZGProof(blob, inputPoint))
        let commitment = assertNoErrorThrow(context.blobToKZGCommitment(blob))
        let result = context.verifyKZGProof(commitment, inputPoint, claimedValue, proof)
        expect(result).to.not.be.instanceOf(Error)
    })

    it('roundtrip - batchComputeBlobProof', () => {
        let seed = 123n
        let poly = randomPoly(seed)
        let blob = poly.toBlob().toBytes()


        let { proof, claimedValue, commitment } = assertNoErrorThrow(context.computeBlobKZGProf(blob))
        let result = context.verifyBlobKZGProofBatch([blob, blob], [commitment, commitment], [proof, proof])
        expect(result).to.not.be.instanceOf(Error)
        result = context.verifyBlobKZGProofBatch([blob, blob], [commitment, commitment], [proof, proof])
        expect(result).to.not.be.instanceOf(Error)
    })
})