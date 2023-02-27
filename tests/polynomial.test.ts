import { expect } from 'chai'
import { Polynomial } from '../src/primitives/polynomial.js'
import { Blob } from '../src/primitives/blob.js'
import { FIELD_ELEMENTS_PER_BLOB } from '../src/constants.js'
import { Scalar } from '../src/primitives/field.js'
import { assertNoErrorThrow } from '../src/utils.js'

describe('polynomial - basic operations', () => {
    it('add/sub', () => {
        let polyA = dummyPolynomial(0n)
        let polyB = dummyPolynomial(1n)
        let result = polyA.sub(polyB)
        let originalPoly = result.add(polyB)
        assertPolyEqual(originalPoly, polyA)
    })
    it('subConstant', () => {
        let polyA = dummyPolynomial(1234n)
        let constant = Scalar.fromBigIntReduce(10n)
        let gotPoly = polyA.subConstant(constant)

        let constantPoly = constantPolynomial(10n)
        let expectedPoly = polyA.sub(constantPoly)

        assertPolyEqual(gotPoly, expectedPoly)
    })
})
describe('polynomial - fromBlob', () => {
    it('invariant', () => {
        let poly = dummyPolynomial(1234n)
        let blob = poly.toBlob()
        assertNoErrorThrow(Polynomial.fromBlob(blob))
    })
})

// Returns a polynomial whose evaluations are contiguous
// One can supply an offset to get different polynomials
function dummyPolynomial(offset: bigint): Polynomial {

    let dummy = new Array()
    for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {
        dummy.push(Scalar.fromBigIntReduce(BigInt(i) + offset))
    }
    return new Polynomial(dummy)
}
function constantPolynomial(constant: bigint): Polynomial {
    let constantEvals = new Array(FIELD_ELEMENTS_PER_BLOB).fill(Scalar.fromBigIntReduce(constant))
    return new Polynomial(constantEvals)
}


function assertPolyEqual(lhs: Polynomial, rhs: Polynomial) {
    expect(lhs.evaluations().length).to.equal(rhs.evaluations().length)

    for (let i = 0; i < lhs.evaluations.length; i++) {
        let isEqual = Scalar.equal(lhs.index(i), rhs.index(i))
        expect(isEqual).to.be.true
    }
}