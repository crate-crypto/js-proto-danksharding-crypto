import { expect } from "chai";
import { Bytes48, Bytes96 } from "../src/primitives/bytearrays.js";
import { G1Point, G2Point } from "../src/primitives/points.js";

export function assertArrEqual(lhs: Uint8Array, rhs: Uint8Array) {
    expect(lhs.toString()).to.equal(rhs.toString())
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