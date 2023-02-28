import { expect } from "chai";
import { Bytes48, Bytes96, G1Point, G2Point, Scalar, Polynomial } from "../src/primitives/index.js";
import { FIELD_ELEMENTS_PER_BLOB } from "../src/constants.js";
import { hashToBLSField } from "../src/fiatshamir.js";
import { numberToBytesLE } from "@noble/curves/abstract/utils";

export function assertArrEqual(lhs: Uint8Array, rhs: Uint8Array) {
    expect(lhs.toString()).to.equal(rhs.toString())
}
export function assertScalarEqual(lhs: Scalar, rhs: Scalar) {
    expect(lhs.toBytes().toString()).to.equal(rhs.toBytes().toString())
}
export function assertBytes48Equal(lhs: Bytes48, rhs: Bytes48) {
    assertArrEqual(lhs.toBytes(), rhs.toBytes())
}
export function assertBytes96Equal(lhs: Bytes96, rhs: Bytes96) {
    assertArrEqual(lhs.toBytes(), rhs.toBytes())
}
export function assertG1PointEqual(lhs: G1Point, rhs: G1Point) {
    assertBytes48Equal(lhs.toBytes48(), rhs.toBytes48())
}
export function assertG2PointEqual(lhs: G2Point, rhs: G2Point) {
    assertBytes96Equal(lhs.toBytes96(), rhs.toBytes96())
}
export function assertPolyEqual(lhs: Polynomial, rhs: Polynomial) {
    expect(lhs.evaluations().length).to.equal(rhs.evaluations().length)

    for (let i = 0; i < lhs.evaluations.length; i++) {
        assertScalarEqual(lhs.index(i), rhs.index(i))
    }
}


// Returns a polynomial whose evaluations are contiguous
// One can supply an offset to get different polynomials
export function dummyPolynomial(offset: bigint): Polynomial {

    let dummy = new Array()
    for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {
        dummy.push(Scalar.fromBigIntReduce(BigInt(i) + offset))
    }
    return new Polynomial(dummy)
}
export function constantPolynomial(constant: bigint): Polynomial {
    let constantEvals = new Array(FIELD_ELEMENTS_PER_BLOB).fill(Scalar.fromBigIntReduce(constant))
    return new Polynomial(constantEvals)
}
export function randomPoly(seed: bigint): Polynomial {
    let polyEvals: Scalar[] = []
    for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {

        let evaluation = hashToBLSField(numberToBytesLE(seed + BigInt(i), 32))
        polyEvals.push(evaluation)
    }
    return new Polynomial(polyEvals)
}

