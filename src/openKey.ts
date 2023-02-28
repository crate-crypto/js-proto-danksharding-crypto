import { hexToBytes } from "@noble/hashes/utils";
import { G1Point, G2Point, pairing_check } from "./primitives/points.js";
import { Scalar } from "./primitives/field.js";
import { assertNoErrorThrow } from "./utils.js";
import openKeyJson from './openKeyJson.json' assert {type: "json"};

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
