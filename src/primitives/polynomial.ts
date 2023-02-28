import { Scalar } from "./field.js";
import { Blob } from "./blob.js";
import { FIELD_ELEMENTS_PER_BLOB, SERIALIZED_SCALAR_SIZE } from "../constants.js";
import { assertNoErrorThrow, concatArrays } from "../utils.js";

export class Polynomial {
    private readonly inner: Scalar[]

    public constructor(arr: Scalar[]) {
        // If the polynomial is created from a `Blob`
        // then this throw should never happen.
        if (arr.length != FIELD_ELEMENTS_PER_BLOB) {
            throw new Error("polynomials must have " + FIELD_ELEMENTS_PER_BLOB + " evaluations")
        }
        this.inner = arr
    }

    // Create a polynomial from a `Blob` which is a fixed sized
    // array.
    // Returns an Error, if the `Blob` is not canonical
    // modulo the scalar field.
    public static fromBlob(blob: Blob): Polynomial | Error {
        let chunks = blob.toChunks();

        let polynomial_evaluations = new Array();
        // We now attempt to convert the 32 byte chunks into
        // field elements
        for (let i = 0; i < chunks.length; i++) {
            let fieldError = Scalar.fromBytes32Checked(chunks[i])
            if (fieldError instanceof Error) return fieldError;
            polynomial_evaluations.push(fieldError as Scalar);
        }
        return new Polynomial(polynomial_evaluations);
    }

    public toBlob(): Blob {
        let evalBytes = this.evaluations().map(evaluation => evaluation.toBytes())
        let flattenedBytes = concatArrays(evalBytes)
        return assertNoErrorThrow(Blob.fromBytes(flattenedBytes))

    }
    // Returns an evaluation of the polynomial 
    // at a specific `index`
    public index(index: number): Scalar {
        return this.inner[index]
    }
    // Returns all of the evaluations of the polynomial
    public evaluations(): Scalar[] {
        return this.inner
    }

    // Returns all of the evaluations subtracted by `constant`
    public subConstant(constant: Scalar): Polynomial {
        let numEvaluations = this.evaluations().length
        let polynomialShifted = []
        for (let i = 0; i < numEvaluations; i++) {
            polynomialShifted.push(Scalar.sub(this.inner[i], constant))
        }
        return new Polynomial(polynomialShifted)
    }
    // Returns the polynomial subtraction of `this` and `other`
    public sub(other: Polynomial): Polynomial {
        // This should not be possible since creating polynomials
        // using the constructor will throw if the size is not
        // `FIELD_ELEMENTS_PER_BLOB`
        let thisLength = this.evaluations().length
        let otherLength = other.evaluations().length

        if (otherLength != thisLength) {
            throw new Error("polynomials must have the same amount of evaluations")
        }

        let result = []
        for (let i = 0; i < thisLength; i++) {
            result.push(Scalar.sub(this.index(i), other.index(i)))
        }
        return new Polynomial(result)
    }
    // Returns the polynomial addition of `this` and `other`
    public add(other: Polynomial): Polynomial {
        let thisLength = this.evaluations().length
        let otherLength = other.evaluations().length
        // See comment in `sub` method for why this branch should
        // not be accessed, unless there is a bug.
        if (thisLength != otherLength) {
            throw new Error("polynomials must have the same amount of evaluations")
        }

        let result = []
        for (let i = 0; i < thisLength; i++) {
            result.push(Scalar.add(this.index(i), other.index(i)))
        }
        return new Polynomial(result)
    }
}
