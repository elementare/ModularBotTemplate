

export function arrayChunk<T>(array: Array<T>, size: number): T[][] {
    const chunkedArray = []
    for (let i = 0; i < array.length; i += size) {
        chunkedArray.push(array.slice(i, i + size))
    }
    return chunkedArray
}