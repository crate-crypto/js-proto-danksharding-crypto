import { sha256 } from '@noble/hashes/sha256';
import { Scalar } from "./primitives/field.js";
import { Blob } from "./primitives/blob.js";
import { numberToBytesLE } from "@noble/curves/abstract/utils";
import { Bytes48 } from './primitives/bytearrays.js';
import { concatArrays } from './utils.js';
import { randomBytes } from '@noble/hashes/utils';
import { bls12_381 } from '@noble/curves/bls12-381';

// The chosen hash method being used in fiat-shamir
// In the consensus specs, this is also shown as `hash` and is
// widely recognized to be sha256 
export function hash(data: Uint8Array): Uint8Array {
    return sha256(data)
}
// Hashes a byte array using `hash` and reduces the 
// big integer that the bte array represents modulo
// the scalar field order.
export function hashToBLSField(data: Uint8Array): Scalar {
    let hashed_data = hash(data);
    return Scalar.fromBytesReduce(hashed_data)
}
// Computes a Fiat-Shamir challenge in the following way:
// Hash(DOMAIN_SEPARATOR, POLY_DEGREE, BLOB, COMMITMENT)
// Returns a scalar.
export function computeChallenge(blob: Blob, commitment: Bytes48): Scalar {
    const FIAT_SHAMIR_PROTOCOL_DOMAIN = "FSBLOBVERIFY_V1_";
    let utf8Encode = new TextEncoder();
    let domainSeparatorBytes = utf8Encode.encode(FIAT_SHAMIR_PROTOCOL_DOMAIN);

    let degreePoly = numberToBytesLE(BigInt(Blob.numFieldElements()), 16);
    return hashToBLSField(concatArrays([domainSeparatorBytes, degreePoly, blob.toBytes(), commitment.toBytes()]));
}
// Computes powers of `scalar` from `0` to `n-1`
// If n == 0, then an empty array is returned
// TODO this is only needed for batching multiple verifications
// TODO together. If we just ask for multiple random integers,
// TODO, then we can avoid this.
export function computePowers(scalar: Scalar, n: number): Scalar[] {
    let currentPower = Scalar.one()
    let powers = new Array()

    for (let i = 0; i < n; i++) {
        powers.push(currentPower)
        currentPower = Scalar.mul(currentPower, scalar)
    }

    return powers
}

// Returns cryptographically secure random bytes
function cryptoRandBytes(numBytes: number): Uint8Array {
    // We call noble's randomBytes function on the hood
    // which eventually calls crypto.node or crypto.web
    return randomBytes(numBytes)
}
// Return a cryptographically generated random scalar
// with negligible bias 
export function cryptoRandScalar(): Scalar {
    // we ask for double the amount of random bytes
    // to make the bias negligible when reducing the
    // array modulo the field order
    let numRandBytesToGenerate = bls12_381.CURVE.Fr.BYTES * 2
    let randBytes = cryptoRandBytes(numRandBytesToGenerate)
    return Scalar.fromBytesReduce(randBytes)
}