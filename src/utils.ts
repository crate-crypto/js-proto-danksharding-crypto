// Helper function to throw when we receive a
// union type between T and Error, and we are 
// sure that an Error would be a bug
export function assertNoErrorThrow<T>(t: T | Error): T {
    if (t instanceof Error) throw t;
    return t as T
}