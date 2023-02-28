import { Polynomial } from '../src/primitives/polynomial.js'
import { Scalar } from '../src/primitives/field.js'
import { assertNoErrorThrow } from '../src/utils.js'
import { assertPolyEqual, constantPolynomial, dummyPolynomial } from './utils.test.js'

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
