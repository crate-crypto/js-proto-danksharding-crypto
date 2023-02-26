// Typing around Uint8Array
//
// We want to encode the fact that some objects are byte arrays with exactly `N` bytes
// when serialized


// This type will represent an untrusted serialized polynomial
export type Blob = Uint8Array

// We need three fixed size arrays Byte32/48/96
// There doesn't seem to be a clean way to have a generic size `N`
// array, so the easiest way is to duplicate code.

// This class will be used for untrusted serialized scalars
// A Bytes32 maintains the invariant that its byte array will
// always hold 32 bytes.
export class Bytes32 {
    private readonly inner: Uint8Array

    public static readonly NUMBER_OF_BYTES = 32;

    private constructor(arr: Uint8Array) {
        this.inner = arr
    }

    public static fromBytes(arr: Uint8Array): Bytes32 | Error {
        if (arr.length != Bytes32.NUMBER_OF_BYTES) {
            return new Error("unexpected byte array of size:" + arr.length)
        }
        return new Bytes32(arr)
    }

    public toBytes(): Uint8Array {
        return this.inner;
    }
}

// This class will be used for untrusted serialized G1 points in compressed form
// A Bytes48 maintains the invariant that its byte array will
// always hold 48 bytes.
export class Bytes48 {
    private readonly inner: Uint8Array

    public static readonly NUMBER_OF_BYTES = 48;

    private constructor(arr: Uint8Array) {
        this.inner = arr
    }

    public static fromBytes(arr: Uint8Array): Bytes48 | Error {
        if (arr.length != Bytes48.NUMBER_OF_BYTES) {
            return new Error("unexpected byte array of size:" + arr.length)
        }
        return new Bytes48(arr)
    }

    public toBytes(): Uint8Array {
        return this.inner;
    }
}

// This class will be used for untrusted serialized G2 points in compressed form
// A Bytes96 maintains the invariant that its byte array will
// always hold 96 bytes.
export class Bytes96 {
    private readonly inner: Uint8Array

    public static readonly NUMBER_OF_BYTES = 96;

    private constructor(arr: Uint8Array) {
        this.inner = arr
    }

    public static fromBytes(arr: Uint8Array): Bytes96 | Error {
        if (arr.length != Bytes96.NUMBER_OF_BYTES) {
            return new Error("unexpected byte array of size:" + arr.length)
        }
        return new Bytes96(arr)
    }

    public toBytes(): Uint8Array {
        return this.inner;
    }
}
