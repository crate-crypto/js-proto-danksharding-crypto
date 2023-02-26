import { expect } from 'chai'
import { add } from '../src/calculator.js'

describe('addition', () => {
    it('add 1 + 2 =3', () => {
        expect(add(1, 2)).to.equal(3)
    });
    it('add 1 + 2 != 4', () => {
        expect(add(1, 2)).to.not.equal(4)
    });
});

