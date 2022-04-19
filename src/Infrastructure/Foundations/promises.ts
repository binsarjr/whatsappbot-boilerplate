/**
 * Sleep promise proccess.
 * @param ms milisecond
 * @returns resolve promise after ms milisecond
 */
export const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))
