import { CommitKey } from "./commitKey.js"
import { Domain } from "./domain.js"
import { OpenKey, VerifyKZGBatch } from "./openKey.js"
import { Bytes32, Bytes48, Blob, Polynomial, G1Point, Scalar, G1AffinePoint } from "./primitives/index.js"
import { computeKZGProofImpl } from "./kzg.js"
import { computeChallenge } from "./fiatshamir.js"
import { assertNoErrorThrow } from "./utils.js"

// Note: we could type alias the fixed type arrays
// such as `Bytes48`, `Bytes32`, however this will
// mean that consumers will need to import these types.
//
// A serialized G1Point. This should be 48 bytes.
export type SerializedPoint = Uint8Array
// A serialized field element. This should be 
// 32 bytes.
export type SerializedScalar = Uint8Array

// This context object will store everything that one 
// needs to:
// - Commit to Blobs
// - Create proofs about Blobs
// - Verify proofs about Blobs
export class Context {
    private domain: Domain
    private openingKey: OpenKey
    private commitKey: CommitKey

    constructor() {
        this.domain = Domain.fromJson()
        this.openingKey = OpenKey.fromJson()
        this.commitKey = CommitKey.fromJson()
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#bytes_to_kzg_commitment
    public blobToKZGCommitment(blobBytes: Uint8Array): SerializedPoint {
        // 1. Deserialize and perform validation checks
        //
        let blob = assertNoErrorThrow(Blob.fromBytes(blobBytes))
        //
        let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))

        // 2. Commit to polynomial
        //
        let commitmentPoint = this.commitKey.commitUnsafe(polynomial)

        // 3. Serialize commitment
        //
        return commitmentPoint.toBytes48().toBytes()
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#compute_kzg_proof
    public computeKZGProof(blobBytes: Uint8Array, zBytes: Uint8Array): { claimedValue: SerializedScalar, proof: SerializedPoint } {
        // 1. Deserialize and perform validation checks
        //
        let blob = assertNoErrorThrow(Blob.fromBytes(blobBytes))
        let z = assertNoErrorThrow(Bytes32.fromBytes(zBytes))
        //
        let polynomial = assertNoErrorThrow(Polynomial.fromBlob(blob))
        let zScalar = assertNoErrorThrow(Scalar.fromBytes32Checked(z))

        // 2. Compute KZG proof
        //
        let proof = assertNoErrorThrow(computeKZGProofImpl(this.domain, this.commitKey, polynomial, zScalar))

        // 3. Serialize proof
        //
        return { claimedValue: proof.claimedValue.toBytes(), proof: proof.quotient.toBytes48().toBytes() }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#compute_blob_kzg_proof
    public computeBlobKZGProf(blobBytes: Uint8Array): { claimedValue: SerializedScalar, commitment: SerializedPoint, proof: SerializedPoint } {

        // 1. Deserialize and perform validation checks
        //
        let blob = assertNoErrorThrow(Blob.fromBytes(blobBytes))
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
        return { claimedValue: proof.claimedValue.toBytes32().toBytes(), commitment: commitment.toBytes(), proof: proof.quotient.toBytes48().toBytes() }
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_kzg_proof
    public verifyKZGProof(commitmentBytes: Uint8Array, zBytes: Uint8Array, yBytes: Uint8Array, proofBytes: Uint8Array): boolean {

        // 1. Deserialize and perform validation checks
        //
        let commitment = assertNoErrorThrow(Bytes48.fromBytes(commitmentBytes))
        let z = assertNoErrorThrow(Bytes32.fromBytes(zBytes))
        let y = assertNoErrorThrow(Bytes32.fromBytes(yBytes))
        let proof = assertNoErrorThrow(Bytes48.fromBytes(proofBytes))
        //
        let commitmentPoint = assertNoErrorThrow(G1Point.fromBytes48Checked(commitment))
        let proofPoint = assertNoErrorThrow(G1Point.fromBytes48Checked(proof))
        let zScalar = assertNoErrorThrow(Scalar.fromBytes32Checked(z))
        let yScalar = assertNoErrorThrow(Scalar.fromBytes32Checked(y))

        // 2. Verify KZG proof
        //
        return this.openingKey.verify(commitmentPoint, zScalar, yScalar, proofPoint)
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_blob_kzg_proof
    public verifyBlobKZGProof(blobBytes: Uint8Array, commitmentBytes: Uint8Array, proofBytes: Uint8Array): boolean {

        // 1. Deserialize and perform validation checks
        //
        let blob = assertNoErrorThrow(Blob.fromBytes(blobBytes))
        let commitment = assertNoErrorThrow(Bytes48.fromBytes(commitmentBytes))
        let proof = assertNoErrorThrow(Bytes48.fromBytes(proofBytes))
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
        return this.openingKey.verify(commitmentPoint, evalChallenge, polyEvaluation, proofPoint)
    }

    // See: https://github.com/ethereum/consensus-specs/blob/ad58bfc3044fa1d8a8331e2741f8e78a6db795e2/specs/deneb/polynomial-commitments.md#verify_blob_kzg_proof_batch
    public verifyBlobKZGProofBatch(blobsBytes: Uint8Array[], commitmentsBytes: Uint8Array[], proofsBytes: Uint8Array[]): boolean {

        let numCommitments = commitmentsBytes.length;

        let sameNumBlobs = numCommitments == blobsBytes.length
        let sameNumProofs = numCommitments == proofsBytes.length
        let allLengthsSame = sameNumBlobs && sameNumProofs
        if (allLengthsSame == false) {
            throw new Error("lengths of commitment, proofs and blobs must be the same, got " + numCommitments + "," + proofsBytes.length + "," + blobsBytes.length)
        }

        let commitmentPoints: G1AffinePoint[] = []
        let proofPoints: G1AffinePoint[] = []
        let inputPoints: Scalar[] = []
        let claimedValues: Scalar[] = []


        for (let i = 0; i < blobsBytes.length; i++) {

            let blob = assertNoErrorThrow(Blob.fromBytes(blobsBytes[i]))
            let commitment = assertNoErrorThrow(Bytes48.fromBytes(commitmentsBytes[i]))
            let proof = assertNoErrorThrow(Bytes48.fromBytes(proofsBytes[i]))

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

        return VerifyKZGBatch(this.openingKey, commitmentPoints, inputPoints, claimedValues, proofPoints)
    }
}