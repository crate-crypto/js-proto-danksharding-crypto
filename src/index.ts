import { CommitKey } from "./commitKey.js"
import { Domain } from "./domain.js"
import { OpenKey, VerifyKZGBatch, VerifyKZGBatchNaive } from "./openKey.js"
import { Bytes32, Bytes48, Blob, Polynomial, G1Point, Scalar, G1AffinePoint } from "./primitives/index.js"
import { computeKZGProofImpl } from "./kzg.js"
import { computeChallenge } from "./fiatshamir.js"
import { assertNoErrorThrow } from "./utils.js"

// A serialized commitment to a polynomial.
export type Commitment = Bytes48
// A serialized commitment to a quotient polynomial.
// The quotient polynomial is what we will use to 
// prove that a polynomial indeed opens to a particular
// point.
export type KZGProof = Bytes48

// This context object will store everything that one 
// needs to:
// - Commit to Blobs
// - Create proofs about Blobs
// - Verify proofs about Blobs
export class Context {
    domain: Domain
    openingKey: OpenKey
    commitKey: CommitKey

    constructor() {
        this.domain = Domain.fromJson()
        this.openingKey = OpenKey.fromJson()
        this.commitKey = CommitKey.fromJson()
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#bytes_to_kzg_commitment
    public blobToKZGCommitment(blob: Blob): Commitment | Error {
        try {
            // 1. Deserialize and perform validation checks
            //
            let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))

            // 2. Commit to polynomial
            //
            let commitmentPoint = this.commitKey.commitUnsafe(polynomial)

            // 3. Serialize commitment
            //
            return commitmentPoint.toBytes48()
        } catch (error) {
            return error as Error
        }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#compute_kzg_proof
    public computeKZGProof(blob: Blob, z: Bytes32): { claimedValue: Scalar, proof: KZGProof } | Error {
        try {
            // 1. Deserialize and perform validation checks
            //
            let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))
            let zScalar = assertNoErrorThrow(Scalar.fromBytes32Checked(z))

            // 2. Compute KZG proof
            //
            let proof = assertNoErrorThrow(computeKZGProofImpl(this.domain, this.commitKey, polynomial, zScalar))

            // 3. Serialize proof
            //
            return { claimedValue: proof.claimedValue, proof: proof.quotient.toBytes48() }
        } catch (error) {
            return error as Error
        }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#compute_blob_kzg_proof
    public computeBlobKZGProf(blob: Blob): { claimedValue: Bytes32, commitment: Commitment, proof: KZGProof } | Error {
        try {
            // 1. Deserialize and perform validation checks
            //
            let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))

            // 2. Commit to polynomial
            //
            let commitmentPoint = this.commitKey.commitUnsafe(polynomial)
            let commitment = commitmentPoint.toBytes48()

            // 3. Compute evaluation challenge
            //
            let evalChallenge = computeChallenge(blob, commitment)

            // 4. Compute KZG proof
            //
            let proof = assertNoErrorThrow(computeKZGProofImpl(this.domain, this.commitKey, polynomial, evalChallenge))

            // 5. Serialize proof data
            //
            return { claimedValue: proof.claimedValue.toBytes32(), commitment: commitment, proof: proof.quotient.toBytes48() }
        } catch (error) {
            return error as Error
        }

    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_kzg_proof
    public verifyKZGProof(commitment: Bytes48, z: Bytes32, y: Bytes32, proof: Bytes48): void | Error {
        try {
            // 1. Deserialize and perform validation checks
            //
            let commitmentPoint = assertNoErrorThrow(G1Point.fromBytes48Checked(commitment))
            let proofPoint = assertNoErrorThrow(G1Point.fromBytes48Checked(proof))
            let zScalar = assertNoErrorThrow(Scalar.fromBytes32Checked(z))
            let yScalar = assertNoErrorThrow(Scalar.fromBytes32Checked(y))

            // 2. Verify KZG proof
            //
            let valid = this.openingKey.verify(commitmentPoint, zScalar, yScalar, proofPoint)
            if (valid == false) {
                return new Error("proof verification returned false")
            }
        } catch (error) {
            return error as Error
        }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_blob_kzg_proof
    public verifyBlobKZGProof(blob: Blob, commitment: Bytes48, proof: Bytes48): void | Error {
        try {
            // 1. Deserialize and perform validation checks
            //
            let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))
            let commitmentPoint = assertNoErrorThrow(G1Point.fromBytes48Checked(commitment))
            let proofPoint = assertNoErrorThrow(G1Point.fromBytes48Checked(proof))

            // 2. Compute evaluation challenge
            //
            let evalChallenge = computeChallenge(blob, commitment)

            // 3. Evaluate polynomial
            //
            let polyEvaluation = this.domain.evaluatePolyInEvalForm(polynomial, evalChallenge)

            // 4. Verify KZG proof
            //
            let valid = this.openingKey.verify(commitmentPoint, evalChallenge, polyEvaluation, proofPoint)
            if (valid == false) {
                return new Error("proof verification returned false")
            }
        } catch (error) {
            return error as Error
        }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_blob_kzg_proof_batch
    public verifyBlobKZGProofBatch(blobs: Blob[], commitments: Bytes48[], proofs: Bytes48[]): void | Error {

        let commitmentPoints: G1AffinePoint[] = []
        let proofPoints: G1AffinePoint[] = []
        let inputPoints: Scalar[] = []
        let claimedValues: Scalar[] = []

        try {
            for (let i = 0; i < blobs.length; i++) {
                let blob = blobs[i]
                let commitment = commitments[i]
                let proof = proofs[i]

                let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))
                let commitmentPoint = assertNoErrorThrow(G1AffinePoint.fromBytesChecked(commitment.toBytes()))
                let proofPoint = assertNoErrorThrow(G1AffinePoint.fromBytesChecked(proof.toBytes()))

                let evaluationChallenge = computeChallenge(blob, commitment)
                let outputPoint = this.domain.evaluatePolyInEvalForm(polynomial, evaluationChallenge)

                commitmentPoints.push(commitmentPoint)
                proofPoints.push(proofPoint)
                inputPoints.push(evaluationChallenge)
                claimedValues.push(outputPoint)
            }
        } catch (error) {
            return error as Error
        }

        return VerifyKZGBatch(this.openingKey, commitmentPoints, inputPoints, claimedValues, proofPoints)
    }
}