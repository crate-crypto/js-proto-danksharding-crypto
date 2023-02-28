import { hexToBytes } from "@noble/hashes/utils";
import { FIELD_ELEMENTS_PER_BLOB } from "./constants.js";
import { Scalar } from "./primitives/field.js";
import { Polynomial } from "./primitives/polynomial.js";
import reversedRootsOfUnity from './reversedRootsOfUnity.json' assert {type: "json"};
import { assertNoErrorThrow } from "./utils.js";

// Domain stores a list of all of the points that
// we want to evaluate our polynomials at. 
// When we specify a polynomial is in lagrange/evaluation form
// this is the domain to which that polynomial is over.
export class Domain {
    rootsOfUnity: Scalar[]
    _size: Scalar
    sizeInv: Scalar

    private constructor(roots: Scalar[]) {
        this.rootsOfUnity = roots
        // Safe: we can safely assume that the number of roots 
        // will not exceed the size of the scalar Scalar.
        // If this happens, then the integer is reduced
        this._size = Scalar.fromBigIntReduce(BigInt(roots.length))
        this.sizeInv = assertNoErrorThrow(Scalar.invert(this._size))

    }
    // Returns a reversed domain from a JSON file; Reversed
    // according to the reverse methods in the specs.
    //
    // Note: We can get them un-reversed and implement those
    // reversing methods.
    public static fromJson(): Domain {
        let numRoots = reversedRootsOfUnity.length
        if (numRoots != FIELD_ELEMENTS_PER_BLOB) {
            throw new Error("mismatch between the number of roots in the domain and the degree of polynomial")
        }
        let roots: Scalar[] = new Array()
        for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {
            let byteArr = hexToBytes(reversedRootsOfUnity[i])
            // This throw is okay as it happens at compile time
            // and will only happen if the json file is corrupt
            let fieldErr = Scalar.fromBytesChecked(byteArr)
            if (fieldErr instanceof Error) throw fieldErr;

            roots.push(fieldErr as Scalar)
        }
        return new Domain(roots)
    }
    // Returns the size of the domain
    // Due to the if guard in fromJson, this will always
    // be `FIELD_ELEMENTS_PER_BLOB`
    public size(): bigint {
        return this._size.integer
    }
    // Evaluates a polynomial in lagrange form
    // The evaluation point can either be in the domain or not
    public evaluatePolyInEvalForm(polynomial: Polynomial, inputPoint: Scalar): Scalar {
        // Check if element is in the domain
        let index = this.findIndexOfElement(inputPoint)
        if (index != -1) {
            // The point is in the domain, so we can evaluate 
            // by indexing the polynomial
            return polynomial.index(index)
        }

        let result = Scalar.zero()
        for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {
            let a = Scalar.mul(polynomial.index(i), this.rootsOfUnity[i])
            let b = Scalar.sub(inputPoint, this.rootsOfUnity[i])
            // We throw here because `b` can only be `0`
            // if the `inputPoint` is in the domain, which we have checked
            let aDivB = assertNoErrorThrow(Scalar.div(a, b))
            result = Scalar.add(result, aDivB)
        }
        result = Scalar.mul(result, this.sizeInv)

        // Compute inputPoint^size -1
        let inputPowWidthMinusOne = Scalar.pow(inputPoint, this._size)
        inputPowWidthMinusOne = Scalar.sub(inputPowWidthMinusOne, Scalar.one())

        return Scalar.mul(result, inputPowWidthMinusOne)
    }

    // TODO: benchmark this to see how fast it is
    // TODO see https://stackoverflow.com/questions/23500591/javascript-fast-lookup-data-structure
    public findIndexOfElement(element: Scalar): number {
        // Equality predicate -- cannot use IndexOf as that will check for 
        // references.
        const equality = (arrElement: Scalar) => arrElement.integer === element.integer;
        return this.rootsOfUnity.findIndex(equality)
    }
}