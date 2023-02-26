import { expect } from 'chai'
import { Scalar } from '../src/primitives/field.js'

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