import { itBench } from "@dapplion/benchmark"
import { Context } from "../src/index.js";
import { dummyPolynomial } from "../tests/utils.test.js";

import { computeBlobKzgProof, loadTrustedSetup, transformTrustedSetupJSON, computeKzgProof, blobToKzgCommitment, verifyBlobKzgProof, verifyBlobKzgProofBatch, verifyKzgProof } from "c-kzg"
import { Scalar } from "../src/primitives/field.js";
const SETUP_FILE_PATH = "./benchmarks/testing_trusted_setup.json"
const file = await transformTrustedSetupJSON(SETUP_FILE_PATH);
loadTrustedSetup(file);

describe("Prover", () => {
    let context = new Context()

    let poly = dummyPolynomial(1234n)
    let blob = poly.toBlob().toBytes()

    let zScalarBytes = Scalar.fromBigIntReduce(1234567n).toBytes()

    itBench("compute blob proof -- this lib", () => {
        let _ = context.computeBlobKZGProf(blob)
    })
    itBench("compute blob proof -- c-kzg", () => {
        computeBlobKzgProof(blob)
    })

    itBench("computeKZGProof - this lib", () => {
        let _ = context.computeKZGProof(blob, zScalarBytes)
    })
    itBench("computeKZGProof - c-kzg", () => {
        computeKzgProof(blob, zScalarBytes)
    })

    itBench("blobToKZGCommitment - this lib", () => {
        let _ = context.blobToKZGCommitment(blob)
    })
    itBench("blobToKZGCommitment - c-kzg", () => {
        blobToKzgCommitment(blob,)
    })
})

describe("Verifier", () => {
    let context = new Context()

    let poly = dummyPolynomial(1234n)
    let blob = poly.toBlob().toBytes()

    let zScalarBytes = Scalar.fromBigIntReduce(1234567n).toBytes()

    // Compute a proof
    let proof = computeBlobKzgProof(blob)
    let commitment = blobToKzgCommitment(blob)

    itBench("verify blob proof -- this lib", () => {
        let _ = context.verifyBlobKZGProof(blob, commitment, proof)
    })
    itBench("verify blob proof -- c-kzg", () => {
        verifyBlobKzgProof(blob, commitment, proof)
    })

    itBench("verify kzg proof -- this lib", () => {
        let _ = context.verifyKZGProof(commitment, zScalarBytes, zScalarBytes, proof)
    })
    itBench("verify kzg proof -- c-kzg", () => {
        let _ = verifyKzgProof(commitment, zScalarBytes, zScalarBytes, proof)
    })

    itBench("verify batch kzg proof (2) -- this lib", () => {
        let _ = context.verifyBlobKZGProofBatch([blob, blob], [commitment, commitment], [proof, proof])
    })
    itBench("verify batch kzg proof (2) -- c-kzg", () => {
        let _ = verifyBlobKzgProofBatch([blob, blob], [commitment, commitment], [proof, proof])
    })


})
