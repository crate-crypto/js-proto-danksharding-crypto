import { expect } from 'chai'
import { Scalar } from '../src/primitives/field.js'
import { assertNoErrorThrow } from '../src/utils.js'
import { bls12_381 } from '@noble/curves/bls12-381'
import { numberToBytesLE } from '@noble/curves/abstract/utils'
import { Bytes32 } from '../src/primitives/bytearrays.js'

describe('batchInvert', () => {
    it('contains zero - batch invert', () => {
        let result = Scalar.batchInvert([Scalar.zero()])
        expect(result).to.be.instanceOf(Error)
    })
    it('contains zero - invert', () => {
        let result = Scalar.invert(Scalar.zero())
        expect(result).to.be.instanceOf(Error)
    })
    it('divide by zero - div', () => {
        let result = Scalar.div(Scalar.one(), Scalar.zero())
        expect(result).to.be.instanceOf(Error)
    })
})

describe('fromCheckedMethods', () => {
    it('checked correct', () => {

        let scalarFromInt = assertNoErrorThrow(Scalar.fromBigIntChecked(123n))
        let bytes32 = scalarFromInt.toBytes32()
        let scalarFromBytes32 = assertNoErrorThrow(Scalar.fromBytes32Checked(bytes32))
        let scalarFromBytes = assertNoErrorThrow(Scalar.fromBytesChecked(bytes32.toBytes()))

        expect(Scalar.equal(scalarFromInt, scalarFromBytes)).to.be.true
        expect(Scalar.equal(scalarFromInt, scalarFromBytes32)).to.be.true
        expect(123n).to.equal(scalarFromInt.integer)

    })
    it('checked incorrect', () => {
        let nonCanonicalInt = bls12_381.CURVE.Fr.ORDER + 1n
        let scalarErr = Scalar.fromBigIntChecked(nonCanonicalInt)
        expect(scalarErr).to.be.instanceOf(Error)

        let nonCanonicalBytes = numberToBytesLE(nonCanonicalInt, 32)
        scalarErr = Scalar.fromBytesChecked(nonCanonicalBytes)
        expect(scalarErr).to.be.instanceOf(Error)

        // We only add 1 to the order so it still fits within 32 bytes
        // and thus no error is thrown
        let nonCanonicalBytes32 = assertNoErrorThrow(Bytes32.fromBytes(nonCanonicalBytes))
        scalarErr = Scalar.fromBytes32Checked(nonCanonicalBytes32)
        expect(scalarErr).to.be.instanceOf(Error)
    })
})