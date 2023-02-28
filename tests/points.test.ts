import { expect } from 'chai'
import { Scalar } from '../src/primitives/field.js'
import { G1AffinePoint, G1Point, G2Point } from '../src/primitives/points.js'
import { assertG1PointEqual } from './utils.test.js'
import { assertNoErrorThrow } from '../src/utils.js'

describe('G1/G2 basic operations', () => {
    it('basic add/sub', () => {
        let gen = G1Point.generator()
        let twoGen = G1Point.add(gen, gen)
        let gotGen = G1Point.sub(twoGen, gen)
        assertG1PointEqual(gotGen, gen)
    })
    it('basic mul', () => {
        let gen = G1Point.generator()
        let gotFourGen = G1Point.mul(gen, Scalar.fromBigIntReduce(4n))
        let twoGen = G1Point.add(gen, gen)
        let expectedFourGen = G1Point.add(twoGen, twoGen)
        assertG1PointEqual(expectedFourGen, gotFourGen)
    })
    it('basic neg', () => {
        let gen = G1Point.generator()
        let negGen = G1Point.neg(gen)
        let expectIdentity = G1Point.add(gen, negGen)
        assertG1PointEqual(expectIdentity, G1Point.identity())
    })
    it('basic g1LinComb', () => {
        let gen = G1Point.generator()
        let genBytes = gen.toBytes48().toBytes()
        let genAff = assertNoErrorThrow(G1AffinePoint.fromBytesChecked(genBytes))
        let one = Scalar.fromBigIntReduce(1n)
        let two = Scalar.fromBigIntReduce(2n)
        // If we make it all ones as scalars, then `montgomery` will fail
        // This is an unlikely edge case, but one nonetheless
        let result = assertNoErrorThrow(G1Point.g1LinCombUnsafe([genAff, genAff], [one, two]))
        let resultSlow = assertNoErrorThrow(G1Point.g1LinCombSlow([genAff, genAff], [one, two]))
        let expectedResult = G1Point.mul(gen, Scalar.fromBigIntReduce(3n))
        assertG1PointEqual(result, expectedResult)
        assertG1PointEqual(resultSlow, expectedResult)
    })
    it('basic fromBytes', () => {
        let gen = G1Point.generator()
        let genBytes = gen.toBytes48().toBytes()
        let gotGen = assertNoErrorThrow(G1Point.fromBytesChecked(genBytes))
        assertG1PointEqual(gen, gotGen)
    })

})
