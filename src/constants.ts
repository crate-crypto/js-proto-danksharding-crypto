// This is the number of evaluations in our polynomial
export const FIELD_ELEMENTS_PER_BLOB = 4096;
// The size of a scalar when serialized.
// It's 32 because the prime associated with
// the field fits within 32 bytes.
export const SERIALIZED_SCALAR_SIZE = 32;
// The size of a G1 point when compressed.
// We never use the uncompressed format.
export const SERIALIZED_G1_COMPRESSED_SIZE = 48;