import { bytesToNumberLE, numberToBytesLE } from '@noble/curves/abstract/utils';
import { bls12_381 } from '@noble/curves/bls12-381';
import { Bytes32 } from './bytearrays.js';

// A representation of the scalar field in the bls12-381 curve
export class Scalar {
    readonly integer: bigint

    // This method assumes that your integer has been reduced.
    private constructor(_integer: bigint) {
        this.integer = _integer
    }

    // Converts a big integer into a scalar.
    // The integer must be reduced modulo the scalar field or
    // an error is returned
    public static fromBigIntChecked(integer: bigint): Scalar | Error {
        // This will check if the bigint is 0 <= n < SCALAR_ORDER
        if (bls12_381.Fr.isValid(integer) == false) {
            return new Error("integer is not valid; it should be less than the modulus")
        }
        return new Scalar(integer);
    }
    // Converts a 32 byte array into a scalar.
    // If the byte array does not represent a canonical integer
    // then an error is returned.
    // Canonical here means that the integer satisfies: 0 <= n < SCALAR_ORDER
    public static fromBytes32Checked(bytes32: Bytes32): Scalar | Error {
        // Convert Bytes32 to `bigint`
        let integerScalarError = bigIntFromBytes32Checked(bytes32);
        if (integerScalarError instanceof Error) return integerScalarError;
        let integer = integerScalarError as bigint;

        return Scalar.fromBigIntChecked(integer);
    }
    // Converts the scalar field to a canonical 32 byte array 
    public toBytes32(): Bytes32 {
        // We throw here as this will indicate a bug.
        // It can only happen if we change the scalar implementation
        // to another curve whose elements need more than 32 bytes.
        if (bls12_381.CURVE.Fr.BYTES != Bytes32.NUMBER_OF_BYTES) {
            throw new Error("trying to convert a scalar to a Bytes32, but it does not fit within 32 bytes")
        }
        return bigIntToBytes32(this.integer)
    }
    // Convert the scalar field to to a byte array
    // Note: It will always be 32 bytes, so we may be able 
    // to remove this and users will need to do `.toBytes32().toBytes()`
    public toBytes(): Uint8Array {
        // This throw will only happen if the Scalar is changed 
        // and the field does not fit within 32 bytes
        if (bls12_381.CURVE.Fr.BYTES != Bytes32.NUMBER_OF_BYTES) {
            throw new Error("trying to convert a Scalar to a Bytes32, but it does not fit within 32 bytes")
        }
        return numberToBytesLE(this.integer, 32)
    }
    // Converts a big integer into a scalar.
    // If the scalar is not canonical, then this method
    // will reduce it.
    // It is therefore important to ensure that this method is 
    // used sparingly in places where malleability is okay.
    public static fromBigIntReduce(integer: bigint): Scalar {
        return new Scalar(integer % bls12_381.Fr.ORDER);
    }
    // Reduces a the byte array modulo the scalar field order
    public static fromBytesReduce(arr: Uint8Array): Scalar {
        // `bytesToNumberLE` has a throw, but its only
        // If a type is casted to a uint8array when it is not
        return Scalar.fromBigIntReduce(bytesToNumberLE(arr));
    }
    // Converts a byte array into a field element. 
    // If the byte array does not represent a reduced 
    // integer modulo the scalar field, then and error is returned
    // Returns a the byte array and turns it into a field element
    // An error is returned if the element is not reduced
    public static fromBytesChecked(arr: Uint8Array): Scalar | Error {
        return Scalar.fromBigIntChecked(bytesToNumberLE(arr));
    }
    // Returns `1` in the scalar field.
    public static one(): Scalar {
        return new Scalar(bls12_381.Fr.ONE);
    }
    // Returns `0` in the scalar field.
    public static zero(): Scalar {
        return new Scalar(bls12_381.Fr.ZERO);
    }
    // Returns true if the scalar represents `0` in the scalar field.
    public isZero(): boolean {
        return this.integer == bls12_381.Fr.ZERO
    }
    // Returns true if the scalar represents `1` in the scalar field.
    public isOne(): boolean {
        return this.integer == bls12_381.Fr.ONE
    }
    // Inverts multiple scalars.
    // This is more efficient than doing `n` inversions
    // individually.
    // This method will return an error if any of the values
    // are zero
    public static batchInvert(values: Scalar[]): Scalar[] | Error {

        // Check if zero is any of the values
        let zeroFound = values.find(element => element.isZero())
        if (zeroFound) {
            return new Error("cannot batch invert when one of the values is `0`")
        }
        let bigints = values.map((field) => field.integer)

        return bls12_381.CURVE.Fr.invertBatch(bigints).map(value => Scalar.fromBigIntReduce(value))
    }
    // Returns the multiplicative inverse of the element
    public static invert(element: Scalar): Scalar | Error {
        if (element.isZero()) {
            return new Error("`0` does not have a multiplicative inverse")
        }
        return new Scalar(bls12_381.CURVE.Fr.inv(element.integer))
    }
    // Returns `a * 1/b` where 1/b is the multiplicative inverse of `b`
    public static div(lhs: Scalar, rhs: Scalar): Scalar | Error {
        if (rhs.isZero()) {
            return new Error("cannot divide by `0`")
        }
        return new Scalar(bls12_381.CURVE.Fr.div(lhs.integer, rhs.integer))
    }
    // Returns `a * b`
    public static mul(lhs: Scalar, rhs: Scalar): Scalar {
        return new Scalar(bls12_381.CURVE.Fr.mul(lhs.integer, rhs.integer))
    }
    // Returns `a + b`
    public static add(lhs: Scalar, rhs: Scalar): Scalar {
        return new Scalar(bls12_381.CURVE.Fr.add(lhs.integer, rhs.integer))
    }
    // Returns `a + (-b)` where -b is the additive inverse of `b`
    public static sub(lhs: Scalar, rhs: Scalar): Scalar {
        return new Scalar(bls12_381.CURVE.Fr.sub(lhs.integer, rhs.integer))
    }
    // Returns the negation of an element; its additive inverse
    public static neg(element: Scalar): Scalar {
        return new Scalar(bls12_381.CURVE.Fr.neg(element.integer))
    }
    // Returns base^{exponent}
    public static pow(base: Scalar, exponent: Scalar): Scalar {
        return new Scalar(bls12_381.CURVE.Fr.pow(base.integer, exponent.integer))
    }
    // Returns true if `lhs` is equal to `rhs`
    public static equal(lhs: Scalar, rhs: Scalar): boolean {
        return bls12_381.CURVE.Fr.eql(lhs.integer, rhs.integer)
    }
}

// Returns a `bigint` representation of the byte array passed in.
// This function will error if the byte array is not canonical
function bigIntFromBytes32Checked(bytes32: Bytes32): bigint | Error {
    try {
        return bls12_381.Fr.fromBytes(bytes32.toBytes());
    }
    catch (error) {
        return error as Error
    }
}


// This function will only throw if numberToBytesLE(T, 32)
// does not return a Uint8Array of length 32. This would be a bug.
//
// Note: this method should only be called on an integer that 
// one knows fits within 32 bytes
function bigIntToBytes32(_integer: bigint): Bytes32 {

    let bytes32Error = Bytes32.fromBytes(numberToBytesLE(_integer, 32));

    if (bytes32Error instanceof Error) throw bytes32Error;
    let bytes32 = (bytes32Error as Bytes32);
    return bytes32
}