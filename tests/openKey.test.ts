import { hexToBytes } from "@noble/curves/abstract/utils"
import { OpenKey } from "../src/openKey.js"
import { G1Point, Scalar } from "../src/primitives/index.js"
import { assertNoErrorThrow } from "../src/utils.js"
import { expect } from "chai"

describe('openingKey', () => {
    it('open contiguous polynomial', () => {
        // Using gnark we committed to the contiguous polynomial
        // call dummyPolynomial(0n) to get it.
        // It is essentially the polynomial with evaluations from 0 to 4095
        let openKey = OpenKey.fromJson()
        let proofBytes = hexToBytes("a4983e2bec859caaa662b87857681e7ac093ed4049ecf688bd66dde235ac52121d0efd337d7d4bad53b0e43375714d0c")
        let commitmentBytes = hexToBytes("a97456b8097baed6e90ce381d2b21c970a3f9ad4f6c92b1bb26337f919bd639dd43bd470839153db09115e2862051f33")
        let inputPointBytes = hexToBytes("0200000000000000000000000000000000000000000000000000000000000000")
        let claimedValueBytes = hexToBytes("7cb82b192a56c8173f73fde74fcf74133889d8a12c76a1da93d77849a273475a")

        let proof = assertNoErrorThrow(G1Point.fromBytesChecked(proofBytes));
        let commitment = assertNoErrorThrow(G1Point.fromBytesChecked(commitmentBytes));
        let inputPoint = assertNoErrorThrow(Scalar.fromBytesChecked(inputPointBytes));
        let claimedValue = assertNoErrorThrow(Scalar.fromBytesChecked(claimedValueBytes));

        let ok = openKey.verify(commitment, inputPoint, claimedValue, proof)
        expect(ok).to.be.true

    })

})
