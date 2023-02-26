import { FIELD_ELEMENTS_PER_BLOB, SERIALIZED_SCALAR_SIZE } from "../constants.js";
import { Bytes32 } from "./bytearrays.js";

// A blob is an untrusted serialized polynomial
export class Blob {
    private readonly inner: Uint8Array

    // The number of bytes needed to represent a blob
    // This will be the number of evaluations in the polynomial
    // multiplied by the size for each evaluation serialized
    public static readonly NUMBER_OF_BYTES = SERIALIZED_SCALAR_SIZE * FIELD_ELEMENTS_PER_BLOB;

    constructor(inner: Uint8Array) {
        this.inner = inner
    }

    public static fromBytes(arr: Uint8Array): Blob | Error {
        if (arr.length != Blob.NUMBER_OF_BYTES) {
            return new Error("got array of size:  " + arr.length + "\n expected an array of size: " + Blob.NUMBER_OF_BYTES)
        }
        return new Blob(arr)
    }
    public toBytes(): Uint8Array {
        return this.inner
    }

    // The number of field elements used to represent
    // the polynomial that this blob represents.
    // This will not changed in production.
    public static numFieldElements(): bigint {
        return BigInt(FIELD_ELEMENTS_PER_BLOB)
    }

    // Convert a blob to chunked 32 byte serialized field
    // elements
    public toChunks(): Bytes32[] {
        let chunks = new Array()
        // Chunk blob into 32 bytes each
        const chunkSize = Bytes32.NUMBER_OF_BYTES;
        for (let i = 0; i < Blob.NUMBER_OF_BYTES; i += chunkSize) {
            const chunk = this.inner.slice(i, i + chunkSize);
            let bytes32Error = Bytes32.fromBytes(chunk);
            // This method will only give an error if the chunkSize
            // is not 32. This would be a bug in our code, so we throw.
            if (bytes32Error instanceof Error) throw bytes32Error;

            let bytes32 = bytes32Error as Bytes32;
            chunks.push(bytes32)
        }
        return chunks
    }
}