import { hexToBytes } from "@noble/curves/abstract/utils"
import { FIELD_ELEMENTS_PER_BLOB } from "../src/constants.js"
import { CommitKey } from "../src/commitKey.js"
import { assertNoErrorThrow } from "../src/utils.js"
import { assertArrEqual, dummyPolynomial } from "./utils.test.js"

// This is outside of the tests as it takes too long
// TODO: make it a part of global test setup
let commitKey = CommitKey.fromJson()

describe('commitKey', () => {
    it('commit to contiguous polynomial', () => {
        let polynomial = dummyPolynomial(0n)
        let commitment = assertNoErrorThrow(commitKey.commit(polynomial))
        // Expected value taken from gnark
        let expectedCommitmentHex = "a97456b8097baed6e90ce381d2b21c970a3f9ad4f6c92b1bb26337f919bd639dd43bd470839153db09115e2862051f33"
        let expectedCommitmentBytes = hexToBytes(expectedCommitmentHex)

        assertArrEqual(expectedCommitmentBytes, commitment.toBytes48().toBytes())
    })

})