/**
 * count duplicate value in an array in javascript
 * @param arr
 * @returns [object]
 */
export const countOfUnique = function <T>(arr: T[]) {
    return arr.reduce(function (prev: any, cur) {
        prev[cur] = (prev[cur] || 0) + 1
        return prev
    }, {})
}

/**
 * Creating chunk with Iterator
 * @param arr Data chunk
 * @param n size of chunk
 */
export const chunksIterator = function <T>(arr: T[], size: number) {
    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
        arr.slice(i * size, i * size + size)
    )
}

/**
 * Creating chunk with generator
 * @param arr Data chunk
 * @param n size of chunk
 */
export const chunks = function* <T>(
    arr: T[],
    n: number
): Generator<T[], void, unknown> {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n)
    }
}

/**
 * Shuffle array
 * @param arr data to be shuffled
 * @returns shuffled
 */
export const shuffle = <T>(arr: T[]) => {
    arr.sort(() => 0.5 - Math.random())
    return arr
}
