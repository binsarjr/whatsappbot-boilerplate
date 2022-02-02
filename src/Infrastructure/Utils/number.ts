/**
 * Get Random Number with range
 * @param min minimal value
 * @param max maximum value
 * @returns result number
 */
export function randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min) + min)
}
