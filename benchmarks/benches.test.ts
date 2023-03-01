import { itBench } from "@dapplion/benchmark"
import { Context } from "../src/index.js";
import { dummyPolynomial } from "../tests/utils.test.js";

describe("Prover", () => {
    let context = new Context()

    let poly = dummyPolynomial(1234n)
    let blob = poly.toBlob().toBytes()

    itBench("compute blob proof", () => {
        let _ = context.computeBlobKZGProf(blob)
    })
})
