import { hexToBytes } from "@noble/hashes/utils";
import { Scalar, G1AffinePoint, G1Point, G2Point, pairing_check } from "./primitives/index.js";
import { assertNoErrorThrow } from "./utils.js";
import openKeyJson from './openKeyJson.json' assert {type: "json"};
import { computePowers, cryptoRandScalar } from "./fiatshamir.js";

// The Opening key is used to check that a polynomial `p`, that 
// one has committed to, indeed evaluates to some point `y`
// given some point `x`, ie the claim that p(x)= y
export class OpenKey {
    genG1: G1Point
    genG2: G2Point
    alphaGenG2: G2Point

    constructor(genG1: G1Point, genG2: G2Point, alphaGenG2: G2Point) {
        this.genG1 = genG1
        this.genG2 = genG2
        this.alphaGenG2 = alphaGenG2
    }
    // Returns the Opening key from a JSON file.
    public static fromJson(): OpenKey {

        let byteArrGenG1 = hexToBytes(openKeyJson.GenG1)
        let byteArrGenG2 = hexToBytes(openKeyJson.GenG2)
        let byteArrAlphaGenG2 = hexToBytes(openKeyJson.AlphaG2)

        let genG1 = assertNoErrorThrow(G1Point.fromBytesChecked(byteArrGenG1))
        let genG2 = assertNoErrorThrow(G2Point.fromBytesChecked(byteArrGenG2))
        let alphaGenG2 = assertNoErrorThrow(G2Point.fromBytesChecked(byteArrAlphaGenG2))


        return new OpenKey(genG1, genG2, alphaGenG2)
    }

    // Verifies a polynomial opening
    // Returns true if the polynomial that has been committed to,
    // is equal to `claimedValue` when evaluated at `inputValue`
    public verify(commitment: G1Point, inputValue: Scalar, claimedValue: Scalar, proof: G1Point): boolean {
        return verifyKZGProofImpl(this, commitment, inputValue, claimedValue, proof)
    }
}
// TODO Maybe we do not need this extra method and we inline it into `verify` 
function verifyKZGProofImpl(openingKey: OpenKey, commitment: G1Point, z: Scalar, y: Scalar, proof: G1Point): boolean {
    let xMinusZ = G2Point.sub(openingKey.alphaGenG2, G2Point.mul(openingKey.genG2, z))
    let pMinusY = G1Point.sub(commitment, G1Point.mul(openingKey.genG1, y))
    let negProof = G1Point.neg(proof)

    return pairing_check([
        { g1: negProof, g2: xMinusZ },
        { g1: pMinusY, g2: openingKey.genG2 }
    ])
}


// This is a naive implementation of verify batching.
// We should implement the version which uses randomness and or the version 
// which uses multiple threads.
//
// NOTE: The function return type is a bit awkward because I want to do something similar to 
// Option<Error> in Rust or just error in golang. Where `None` or `nil` means that
// the verification was successful.
// Returning a boolean gives less context.
export function VerifyKZGBatchNaive(openingKey: OpenKey, commitments: G1AffinePoint[], zs: Scalar[], ys: Scalar[], proofs: G1AffinePoint[]): void | Error {
    let numCommitments = commitments.length;

    let sameNumInputPoints = numCommitments == zs.length
    let sameNumOutputPoint = numCommitments == ys.length
    let sameNumProofs = numCommitments == proofs.length
    let allLengthsSame = sameNumInputPoints && sameNumOutputPoint && sameNumProofs
    if (allLengthsSame == false) {
        // It is okay to throw here and we expect the method that
        // calls this to ensure that the lengths are the same
        // We do not throw as we are already returning an error, so it doesn't hurt
        return new Error("lengths of commitment, inputValues and output values must be the same, got " + numCommitments + "," + zs.length + "," + ys.length)
    }

    for (let i = 0; i < numCommitments; i++) {
        let verified = verifyKZGProofImpl(openingKey, G1Point.fromAffine(commitments[i]), zs[i], ys[i], G1Point.fromAffine(proofs[i]))
        if (verified == false) {
            return new Error("proof at position " + i + " failed to verify")
        }
    }
}
// Batch verifies multiple KZG proofs using one pairing and randomness
// We get randomness from a cryptographically secure source
// so we do not need to use Fiat-Shamir as specified in the specs to generate
// it.
export function VerifyKZGBatch(openingKey: OpenKey, commitments: G1AffinePoint[], zs: Scalar[], ys: Scalar[], proofs: G1AffinePoint[]): void | Error {
    let randomScalar = cryptoRandScalar()
    let powersOfRandomScalar = computePowers(randomScalar, commitments.length)

    // This method throws if the length of the two vectors are not equal
    // This would be a bug. The same logic applies to the g1LinComb below
    let proofLinComb = assertNoErrorThrow(G1Point.g1LinCombSlow(proofs, powersOfRandomScalar))

    // Take the Hadamard product of the `zs` and randomScalar arrays 
    let ZiRi = zs.map(function (z, i) {
        return Scalar.mul(z, powersOfRandomScalar[i]);
    });

    let proofZLinComb = assertNoErrorThrow(G1Point.g1LinCombSlow(proofs, ZiRi))

    let CMinusYs = []
    for (let i = 0; i < commitments.length; i++) {
        let commitment = G1Point.fromAffine(commitments[i])
        let y = ys[i]

        let yGenG1 = G1Point.mul(openingKey.genG1, y)
        CMinusYs.push(G1Point.sub(commitment, yGenG1))
    }

    let CMinusYLinComb = assertNoErrorThrow(G1Point.g1LinCombProj(CMinusYs, powersOfRandomScalar))

    let negAlphaGenG2 = G2Point.neg(openingKey.alphaGenG2)
    let CMinusYAddProofZLinComb = G1Point.add(CMinusYLinComb, proofZLinComb)

    let valid = pairing_check([
        { g1: proofLinComb, g2: negAlphaGenG2 },
        { g1: CMinusYAddProofZLinComb, g2: openingKey.genG2 }
    ])

    if (valid == false) {
        return new Error("proof is invalid")
    }
}
