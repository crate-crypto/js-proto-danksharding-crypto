import { Scalar } from './field.js';
import { bls12_381 } from '@noble/curves/bls12-381'; // ECMAScript Modules (ESM) and Common.js
import { Bytes48, Bytes96 } from './bytearrays.js';
import { AffinePoint, ProjPointType } from '@noble/curves/abstract/weierstrass';
import { msmBigint } from 'montgomery';
import { assertNoErrorThrow } from '../utils.js';


// TODO: I'm not sure how to get Fp2 from bls12_381 import
// TODO so we are being hacky and just copying it from the lib
type Fp2 = { c0: bigint; c1: bigint };

// We store G1 points in both projective and affine
// The affine format is used exclusively for the 
// SRS which does not need to be in projective form
// 
// TODO: we could get rid of it, by implementing 
// normalisation such that it notices when z=1 
// and skips the inversion, but this seems relatively
// complex compared to just having this class
export class G1AffinePoint {
    readonly _inner: AffinePoint<bigint>

    constructor(point: AffinePoint<bigint>) {
        this._inner = point
    }

    // Converts the byte array into an affine point 
    // and errors if the byte array is not a valid encoding of 
    // a G1 point.
    public static fromBytesChecked(arr: Uint8Array): G1AffinePoint | Error {
        try {
            // TODO document what this is actually checking
            let affine = bls12_381.CURVE.G1.fromBytes(arr);
            return new G1AffinePoint(affine)
        } catch (error) {
            if (error instanceof Error) return error;
            return new Error("Invalid G1 point")
        }
    }

}

export class G1Point {
    readonly _inner: ProjPointType<bigint>

    private constructor(point: ProjPointType<bigint>) {
        this._inner = point
    }

    // Convert a byte array into a Projective point 
    // and returns an error if the byte array is not a valid
    // encoding of a G1 point
    public static fromBytesChecked(arr: Uint8Array): G1Point | Error {

        let bytes48Error = Bytes48.fromBytes(arr);
        if (bytes48Error instanceof Error) return bytes48Error;
        let bytes48 = bytes48Error as Bytes48;

        return G1Point.fromBytes48Checked(bytes48)
    }
    public static fromBytes48Checked(bytes48: Bytes48): G1Point | Error {
        try {
            // TODO document what this is actually checking
            let affine = bls12_381.CURVE.G1.fromBytes(bytes48.toBytes());
            return new G1Point(bls12_381.G1.ProjectivePoint.fromAffine(affine))
        } catch (error) {
            if (error instanceof Error) return error;
            return new Error("Invalid G1 point")
        }
    }

    public static fromAffine(affine: G1AffinePoint): G1Point {
        let proj = bls12_381.G1.ProjectivePoint.fromAffine(affine._inner)
        return new G1Point(proj)
    }

    // Returns the identity element in the group
    public static identity(): G1Point {
        return new G1Point(bls12_381.G1.ProjectivePoint.ZERO)
    }
    // Returns true if this element is equal to the identity
    public isIdentity(): boolean {
        return this._inner.equals(bls12_381.G1.ProjectivePoint.ZERO)
    }

    // Returns the standardized generator for the group
    public static generator(): G1Point {
        return new G1Point(bls12_381.G1.ProjectivePoint.BASE)
    }
    // Encode the point in compressed format
    public toBytes48(): Bytes48 {
        return affinePointG1ToBytes48(this._inner.toAffine())
    }
    // Returns `lhs` + `rhs`
    public static add(lhs: G1Point, rhs: G1Point): G1Point {
        return new G1Point(lhs._inner.add(rhs._inner))
    }
    // Returns `lhs` - `rhs`
    public static sub(lhs: G1Point, rhs: G1Point): G1Point {
        return new G1Point(lhs._inner.subtract(rhs._inner))
    }
    // Returns the scalar multiplication of `lhs` and `scalar`
    public static mul(lhs: G1Point, scalar: Scalar): G1Point {
        // For some reason, noble library does not see
        // 0 as a valid scalar when doing a  scalar multiplication
        // so we manually check that edge case
        if (scalar.integer == 0n) {
            return new G1Point(bls12_381.G1.ProjectivePoint.ZERO)
        }
        // Unsafe refers to it not being constant time 
        // This is fine as all of our inputs are public
        // TODO check what else are the conditions for 
        // TODO this panicking multiply method panicking
        return new G1Point(lhs._inner.multiplyUnsafe(scalar.integer))
    }
    // Negates an element in the group
    public static neg(element: G1Point): G1Point {
        return new G1Point(element._inner.negate())
    }

    // Computes a multi-exponentiation.
    // This is essentially the inner product between `points` and `scalars`
    public static g1LinCombProj(points: G1Point[], scalars: Scalar[]): G1Point | Error {
        if (points.length != scalars.length) {
            return new Error("g1LinComb requires the number of points to be equal to the number of scalars");
        }
        // TODO: can multithread the `mul` here
        let result = G1Point.identity();
        for (let i = 0; i < points.length; i++) {
            let partialSum = G1Point.mul(points[i], scalars[i])
            result = G1Point.add(result, partialSum)
        }

        return result
    }
    public static g1LinCombSlow(points: G1AffinePoint[], scalars: Scalar[]): G1Point | Error {
        let projPoints = points.map(point => G1Point.fromAffine(point))
        return G1Point.g1LinCombProj(projPoints, scalars)
    }

    // Computes a multi-exponentiation.
    // This algorithm uses an optimized version of Pippenger
    // This is unsafe as it uses an experimental implementation.
    // It should be avoided for verification unless speed is not an issue
    public static g1LinCombUnsafe(points: G1AffinePoint[], scalars: Scalar[]): G1Point | Error {

        if (points.length != scalars.length) {
            return new Error("g1LinComb requires the number of points to be equal to the number of scalars");
        }
        let innerScalars = scalars.map((scalar) => scalar.integer)

        // Convert the point to the layout needed by the montgomery library.
        // We set isInfinity to false, as we know that our SRS does not contain any 
        // infinity points.
        let inputPoints = points.map((point) => ({ x: point._inner.x, y: point._inner.y, isInfinity: false }))

        let result = msmBigint(innerScalars, inputPoints)
        if (result.isInfinity) {
            return new G1Point(bls12_381.G1.ProjectivePoint.ZERO)
        }
        let projResult = bls12_381.G1.ProjectivePoint.fromAffine({ x: result.x, y: result.y })
        return new G1Point(projResult)
    }
}

export class G2Point {
    readonly _inner: ProjPointType<Fp2>

    private constructor(point: ProjPointType<Fp2>) {
        this._inner = point
    }

    public static fromBytesChecked(arr: Uint8Array): G2Point | Error {

        let bytes96Error = Bytes96.fromBytes(arr);
        if (bytes96Error instanceof Error) return bytes96Error;
        let bytes96 = bytes96Error as Bytes96;

        return G2Point.fromBytes96Checked(bytes96)
    }
    public static fromBytes96Checked(bytes96: Bytes96): G2Point | Error {

        try {
            let affine = bls12_381.CURVE.G2.fromBytes(bytes96.toBytes());
            return new G2Point(bls12_381.G2.ProjectivePoint.fromAffine(affine))
        } catch (error) {
            if (error instanceof Error) return error;
            return new Error("Invalid G1 point")
        }
    }
    public static identity(): G2Point {
        return new G2Point(bls12_381.G2.ProjectivePoint.ZERO)
    }
    // Returns true if this element is equal to the identity
    public isIdentity(): boolean {
        return this._inner.equals(bls12_381.G2.ProjectivePoint.ZERO)
    }
    public static generator(): G2Point {
        return new G2Point(bls12_381.G2.ProjectivePoint.BASE)
    }

    public toBytes96(): Bytes96 {
        return affinePointG2ToBytes96(this._inner.toAffine())
    }
    public static add(lhs: G2Point, rhs: G2Point): G2Point {
        return new G2Point(lhs._inner.add(rhs._inner))
    }
    public static sub(lhs: G2Point, rhs: G2Point): G2Point {
        return new G2Point(lhs._inner.subtract(rhs._inner))
    }
    public static mul(lhs: G2Point, scalar: Scalar): G2Point {
        // For some reason, noble library does not see
        // 0 as a valid scalar when doing scalar multiplication
        if (scalar.integer == 0n) {
            return new G2Point(bls12_381.G2.ProjectivePoint.ZERO)
        }
        // Unsafe refers to it not being constant time 
        // This is fine as all of our inputs are public
        // TODO check what else are the conditions for 
        // TODO this panicking multiply method panicking
        return new G2Point(lhs._inner.multiplyUnsafe(scalar.integer))
    }
    public static neg(element: G2Point): G2Point {
        return new G2Point(element._inner.negate())
    }

}

// Computes multiple pairings, doing only one final exponentiation
export function pairing_check(pairs: { g1: G1Point, g2: G2Point }[]): boolean {
    let paired = new Array()

    for (let i = 0; i < pairs.length; i++) {
        if (pairs[i].g1.isIdentity() || pairs[i].g2.isIdentity()) {
            continue
        }
        paired.push(bls12_381.pairing(pairs[i].g1._inner, pairs[i].g2._inner, false))
    }

    const product = paired.reduce((a, b) => bls12_381.Fp12.mul(a, b), bls12_381.Fp12.ONE);
    const exp = bls12_381.CURVE.Fp12.finalExponentiate(product);
    return bls12_381.Fp12.eql(exp, bls12_381.Fp12.ONE);
}


function affinePointG1ToBytes48(point: AffinePoint<bigint>): Bytes48 {
    // This seems like a waste to convert from affine to projective
    // because serialization requires one to convert back to affine
    let projPoint = bls12_381.G1.ProjectivePoint.fromAffine(point)
    let bytesArr = bls12_381.CURVE.G1.toBytes(bls12_381.G1.ProjectivePoint, projPoint, true)

    // If the noble library does not return a Uint8Array
    // of length 48, then this is a bug.
    return assertNoErrorThrow(Bytes48.fromBytes(bytesArr))
}
function affinePointG2ToBytes96(point: AffinePoint<Fp2>): Bytes96 {
    let projPoint = bls12_381.G2.ProjectivePoint.fromAffine(point)
    let bytesArr = bls12_381.CURVE.G2.toBytes(bls12_381.G2.ProjectivePoint, projPoint, true)

    // If the noble library does not return a Uint8Array
    // of length 96, then this is a bug.
    return assertNoErrorThrow(Bytes96.fromBytes(bytesArr))
}