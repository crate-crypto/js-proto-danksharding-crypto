import { Scalar, Polynomial } from '../src/primitives/index.js'
import { Domain } from '../src/domain.js'
import { expect } from 'chai'
import { FIELD_ELEMENTS_PER_BLOB } from '../src/constants.js';
import { assertArrEqual, assertScalarEqual } from './utils.test.js';

describe('domain', () => {
    it('domain can be constructed', () => {
        let domain = Domain.fromJson()
        expect(domain.size()).to.equal(BigInt(FIELD_ELEMENTS_PER_BLOB))
    })
    it('find element in domain', () => {
        let domain = Domain.fromJson()
        // Clone the domain, because there are equality methods
        // in js, which will check equality `===` by checking if
        // the object is exactly the same object, meaning the same 
        // memory reference. Whereas we want value equality.
        let domain_clone = Domain.fromJson()
        let roots: Scalar[] = domain_clone.rootsOfUnity

        for (let i = 0; i < domain.size(); i++) {
            let rootInDomain = roots[i]
            let index = domain.findIndexOfElement(rootInDomain)
            expect(index).to.not.equal(-1, "element was in domain, but find method returned not found")
            expect(index).to.equal(i)
        }
        // zero is not a root of unity, so we expect to get -1
        let zero = Scalar.fromBigIntReduce(0n)
        expect(domain.findIndexOfElement(zero)).to.equal(-1)

        // -1 is also not a root of unity for this usecase
        // so we also expect a -1
        let minusOne = Scalar.fromBigIntReduce(-1n)
        expect(domain.findIndexOfElement(minusOne)).to.equal(-1)

        // `1` is a root of unity and we expect it to be the first one
        // Even after reversing the domain
        let one = Scalar.one()
        expect(domain.findIndexOfElement(one)).to.equal(0)
    })
    it('evaluate polynomial in/out domain', () => {
        let domain = Domain.fromJson()

        let polynomial = dummyPolynomial(domain.size())

        // Evaluate the polynomial at all points on the domain
        for (let i = 0; i < domain.size(); i++) {
            let root = domain.rootsOfUnity[i]
            let gotPolyOutput = domain.evaluatePolyInEvalForm(polynomial, root)
            let expectedPolyOutput = polynomial.index(i)
            assertScalarEqual(gotPolyOutput, expectedPolyOutput)
        }

        // Evaluate on a point not in the domain
        let evaluation = Scalar.fromBigIntReduce(1234n)
        let expectedPolyOutput = new Uint8Array([63, 110, 105, 211, 238, 35, 205, 240, 222, 86, 44, 39, 223, 10, 75, 110, 123, 36, 69, 239, 44, 146, 89, 38, 170, 68, 122, 16, 201, 191, 22, 49])
        let gotPolyOutput = domain.evaluatePolyInEvalForm(polynomial, evaluation)
        assertArrEqual(gotPolyOutput.toBytes(), expectedPolyOutput)
    })
})

function dummyPolynomial(numEvaluations: bigint): Polynomial {
    // Create a polynomial whose evaluations are 0 to numEvaluations-1
    let evaluations = new Array()
    for (let i = 0; i < numEvaluations; i++) {
        let evaluation = Scalar.fromBigIntReduce(BigInt(i))
        evaluations.push(evaluation)
    }
    return new Polynomial(evaluations)
}