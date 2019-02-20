export const reduceAsync = <T, U>(
    a: T[],
    seed: U,
    f: (a: U, b: T) => U
): Promise<U> => {
    return a.reduce(async (prev, next) => {
        const result = await prev;
        return f(result, next);
    }, Promise.resolve(seed));
};
