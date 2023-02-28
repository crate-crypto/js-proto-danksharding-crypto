import { CommitKey } from "./commitKey.js"
import { Domain } from "./domain.js"
import { OpenKey, VerifyKZGBatch, VerifyKZGBatchNaive } from "./openKey.js"
import { Bytes32, Bytes48, Blob, Polynomial, G1Point, Scalar, G1AffinePoint } from "./primitives/index.js"
import { computeKZGProofImpl } from "./kzg.js"
import { computeChallenge } from "./fiatshamir.js"

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
        // 1. Deserialize and perform validation checks
        //
        let polynomialErr = Polynomial.fromBlob(blob)
        if (polynomialErr instanceof Error) return polynomialErr;
        let polynomial = polynomialErr as Polynomial

        // 2. Commit to polynomial
        //
        let commitmentPoint = this.commitKey.commitUnsafe(polynomial)

        // 3. Serialize commitment
        //
        return commitmentPoint.toBytes48()
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#compute_kzg_proof
    public computeKZGProof(blob: Blob, z: Bytes32): { claimedValue: Scalar, proof: KZGProof } | Error {
        // 1. Deserialize and perform validation checks
        //
        let polynomialErr = Polynomial.fromBlob(blob)
        let zScalarErr = Scalar.fromBytes32Checked(z)

        if (polynomialErr instanceof Error) return polynomialErr;
        if (zScalarErr instanceof Error) return zScalarErr;

        let polynomial = polynomialErr as Polynomial
        let zScalar = zScalarErr as Scalar

        // 2. Compute KZG proof
        //
        let proofErr = computeKZGProofImpl(this.domain, this.commitKey, polynomial, zScalar)
        if (proofErr instanceof Error) return proofErr;
        let proof = proofErr as { claimedValue: Scalar, quotient: G1Point }

        // 3. Serialize proof
        //
        return { claimedValue: proof.claimedValue, proof: proof.quotient.toBytes48() }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#compute_blob_kzg_proof
    public computeBlobKZGProf(blob: Blob): { claimedValue: Bytes32, commitment: Commitment, proof: KZGProof } | Error {
        // 1. Deserialize and perform validation checks
        //
        let polynomialErr = Polynomial.fromBlob(blob)
        if (polynomialErr instanceof Error) return polynomialErr;
        let polynomial = polynomialErr as Polynomial

        // 2. Commit to polynomial
        //
        let commitmentPoint = this.commitKey.commitUnsafe(polynomial)
        let commitment = commitmentPoint.toBytes48()

        // 3. Compute evaluation challenge
        //
        let evalChallenge = computeChallenge(blob, commitment)

        // 4. Compute KZG proof
        //
        let proofErr = computeKZGProofImpl(this.domain, this.commitKey, polynomial, evalChallenge)
        if (proofErr instanceof Error) return proofErr;
        let proof = proofErr as { claimedValue: Scalar, quotient: G1Point }

        // 5. Serialize proof data
        //
        return { claimedValue: proof.claimedValue.toBytes32(), commitment: commitment, proof: proof.quotient.toBytes48() }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_kzg_proof
    public verifyKZGProof(commitment: Bytes48, z: Bytes32, y: Bytes32, proof: Bytes48): void | Error {

        // 1. Deserialize and perform validation checks
        //
        let commitmentPointErr = G1Point.fromBytes48Checked(commitment)
        let proofPointErr = G1Point.fromBytes48Checked(proof)
        let zScalarErr = Scalar.fromBytes32Checked(z)
        let yScalarErr = Scalar.fromBytes32Checked(y)

        if (commitmentPointErr instanceof Error) return commitmentPointErr;
        if (proofPointErr instanceof Error) return proofPointErr;
        if (zScalarErr instanceof Error) return zScalarErr;
        if (yScalarErr instanceof Error) return yScalarErr;

        let commitmentPoint = commitmentPointErr as G1Point
        let proofPoint = proofPointErr as G1Point
        let zScalar = zScalarErr as Scalar
        let yScalar = yScalarErr as Scalar

        // 2. Verify KZG proof
        //
        let valid = this.openingKey.verify(commitmentPoint, zScalar, yScalar, proofPoint)
        if (valid == false) {
            return new Error("proof verification returned false")
        }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_blob_kzg_proof
    public verifyBlobKZGProof(blob: Blob, commitment: Bytes48, proof: Bytes48): void | Error {
        // 1. Deserialize and perform validation checks
        //
        let polynomialErr = Polynomial.fromBlob(blob)
        let commitmentPointErr = G1Point.fromBytes48Checked(commitment)
        let proofPointErr = G1Point.fromBytes48Checked(proof)

        if (polynomialErr instanceof Error) return polynomialErr;
        if (commitmentPointErr instanceof Error) return commitmentPointErr;
        if (proofPointErr instanceof Error) return proofPointErr;

        let polynomial = polynomialErr as Polynomial
        let commitmentPoint = commitmentPointErr as G1Point
        let proofPoint = proofPointErr as G1Point


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
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_blob_kzg_proof_batch
    public verifyBlobKZGProofBatch(blobs: Blob[], commitments: Bytes48[], proofs: Bytes48[]): void | Error {

        let commitmentPoints: G1AffinePoint[] = []
        let proofPoints: G1AffinePoint[] = []
        let inputPoints: Scalar[] = []
        let claimedValues: Scalar[] = []

        for (let i = 0; i < blobs.length; i++) {
            let blob = blobs[i]
            let commitment = commitments[i]

            let polynomialErr = Polynomial.fromBlob(blobs[i])
            let commitmentErr = G1AffinePoint.fromBytesChecked(commitments[i].toBytes())
            let proofErr = G1AffinePoint.fromBytesChecked(proofs[i].toBytes())

            if (polynomialErr instanceof Error) return polynomialErr;
            if (commitmentErr instanceof Error) return commitmentErr;
            if (proofErr instanceof Error) return proofErr;

            let polynomial = polynomialErr as Polynomial
            let commitmentPoint = commitmentErr as G1AffinePoint
            let proofPoint = proofErr as G1AffinePoint
            let evaluationChallenge = computeChallenge(blob, commitment)

            let outputPoint = this.domain.evaluatePolyInEvalForm(polynomial, evaluationChallenge)

            commitmentPoints.push(commitmentPoint)
            proofPoints.push(proofPoint)
            inputPoints.push(evaluationChallenge)
            claimedValues.push(outputPoint)
        }

        return VerifyKZGBatch(this.openingKey, commitmentPoints, inputPoints, claimedValues, proofPoints)
    }
}