// Helper function to throw when we receive a
// union type between T and Error, and we are 
// sure that an Error would be a bug
export function assertNoErrorThrow<T>(t: T | Error): T {
    if (t instanceof Error) throw t;
    return t as T
}

// There should be some canonical way to join multiple Uint8Arrays
// The spread operator was noted to be 27x slower than this method
// See: https://stackoverflow.com/a/49129872
export function concatArrays(arrays: Uint8Array[]): Uint8Array {
    // Get the total length of all arrays
    let length = 0;
    arrays.forEach(item => {
        length += item.length;
    });

    // Create a new array with total length and merge all source arrays.
    let mergedArray = new Uint8Array(length);
    let offset = 0;
    arrays.forEach(item => {
        mergedArray.set(item, offset);
        offset += item.length;
    });

    return mergedArray
}