import { CommitKey } from "./commitKey.js"
import { Domain } from "./domain.js"
import { Scalar, G1Point, Polynomial } from "./primitives/index.js"
import { assertNoErrorThrow } from "./utils.js"

// Computes the quotient polynomial evaluated at a point in the domain.
// The domain consists of roots of unity. In the specs, this value is denoted `z`
//
// This method will throw if `rootOfUnity` is equal to zero.
// Since 0 is not a root of unity, this would be a bug in the code.
//
// The quotient polynomial is denoted as f(x) - f(z) / x - z
// The value f(z) is what we are calling `f_eval`
function computeQuotientEvalWithinDomain(domain: Domain, rootOfUnity: Scalar, polynomial: Polynomial, f_eval: Scalar): Scalar | Error {
    if (rootOfUnity.isZero()) {
        return new Error("`rootOfUnity` cannot be zero")
    }
    let result = Scalar.zero()
    for (let i = 0; i < domain.size(); i++) {
        let omega_i = domain.rootsOfUnity[i]
        if (Scalar.equal(omega_i, rootOfUnity)) {
            continue
        }

        let f_i = Scalar.sub(polynomial.index(i), f_eval)
        let numerator = Scalar.mul(f_i, omega_i)
        let denominator = Scalar.mul(rootOfUnity, Scalar.sub(rootOfUnity, omega_i))
        // This will only throw if denominator = 0
        // Which is the case when
        // `rootOUnity` == 0: since we expect `rootOUnity` to be a root of unity, this should not happen
        // `rootOUnity` == omega_i: Since we skip on this case using the if statement above
        // this should also not happen.
        let numDivDen = assertNoErrorThrow(Scalar.div(numerator, denominator))
        result = Scalar.add(result, numDivDen)
    }
    return result
}

// Computes a KZG opening proof and returns the quotient commitment
// along with the value that this polynomial evaluates to at the 
// chosen inputPoint.
export function computeKZGProofImpl(domain: Domain, commitKey: CommitKey, polynomial: Polynomial, inputPoint: Scalar): { claimedValue: Scalar, quotient: G1Point } | Error {
    let y = domain.evaluatePolyInEvalForm(polynomial, inputPoint)
    let polynomialShifted = polynomial.subConstant(y)

    let rootsPoly = new Polynomial(domain.rootsOfUnity)
    let denominatorPoly = rootsPoly.subConstant(inputPoint)
    let denominatorEvals = denominatorPoly.evaluations()

    // Check if the element is in the domain
    let index = domain.findIndexOfElement(inputPoint)
    if (index != -1) {
        // Replace this evaluation by 1
        // so we can batch invert, otherwise 
        // batch inversion will fail as this is zero
        denominatorEvals[index] = Scalar.one()
    }
    // Since we know that the denominator will not contain any zeroes
    // it is okay to throw here.
    denominatorEvals = assertNoErrorThrow(Scalar.batchInvert(denominatorEvals))

    if (index != -1) {
        // This branch is only taken if `z` was a root of unity.
        // We can throw here as the computeQuotientEval method, only
        // returns an Error when z=0 which is not a root of unity.
        denominatorEvals[index] = assertNoErrorThrow(computeQuotientEvalWithinDomain(domain, inputPoint, polynomial, y))
    }

    for (let i = 0; i < domain.size(); i++) {
        let a = polynomialShifted.index(i)
        let b = denominatorEvals[i]
        denominatorEvals[i] = Scalar.mul(a, b)
    }

    let quotientComm = commitKey.commitUnsafe(new Polynomial(denominatorEvals))

    return { claimedValue: y, quotient: quotientComm }
}
