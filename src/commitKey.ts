import { hexToBytes } from "@noble/hashes/utils";
import { FIELD_ELEMENTS_PER_BLOB } from "./constants.js";
import { G1AffinePoint, G1Point } from "./primitives/points.js";
import { Polynomial } from "./primitives/polynomial.js";
import reversedCommitKey from './reversedCommitKey.json' assert {type: "json"};
import { assertNoErrorThrow } from "./utils.js";

// The commit key is used to commit to polynomials
// For our usecase/kzg, the commit key has a particular 
// structure,  [G, s*G, s^2*G, s^3*G, s^n*G]
export class CommitKey {
    g1Points: G1AffinePoint[]

    private constructor(points: G1AffinePoint[]) {
        this.g1Points = points
    }
    // Returns the reversed commitment key from a JSON file.
    // Reversed according to the reverse methods in the specs.
    public static fromJson(): CommitKey {
        let numPoints = reversedCommitKey.length
        if (numPoints != FIELD_ELEMENTS_PER_BLOB) {
            throw new Error("mismatch between the number of points in the commit key and the degree of polynomial")
        }

        let points: G1AffinePoint[] = new Array()
        for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {
            let byteArr = hexToBytes(reversedCommitKey[i])
            // This throw is okay as it happens at compile 
            // time and means that the SRS is corrupted
            let point = assertNoErrorThrow(G1AffinePoint.fromBytesChecked(byteArr))
            points.push(point)
        }

        return new CommitKey(points)
    }

    // Commits to a polynomial using the commitment key
    public commit(polynomial: Polynomial): G1Point {
        // This method will throw if the number of `g1Points` differs from 
        // the number of evaluations in the polynomial. This would be a bug.
        return assertNoErrorThrow(G1Point.g1LinCombUnsafe(this.g1Points, polynomial.evaluations()))
    }
}