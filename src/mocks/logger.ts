export const createMockLogger = <T extends string>(...spiedMethods: T[]) => {
    const spies = spiedMethods.reduce(
        (out, curr) => ({
            ...out,
            [curr]: jest.fn()
        }),
        {} as Record<T, jest.Mock>
    );

    const logger = new Proxy(
        {},
        {
            get(target, prop: T) {
                return (...msg: any[]) => {
                    spies[prop] && spies[prop](...msg);
                    console.log(String(prop), ...msg);
                };
            }
        }
    );

    return { spies, logger };
};
