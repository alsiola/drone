import { TypeC, Props } from "io-ts";

export const validateParams = <TParams extends Props>(
    route: string,
    params: TypeC<TParams>
) => {
    const matchedParams = route.match(/:([^\/]*)/g);

    Object.keys(params.props).forEach(key => {
        if (!matchedParams) {
            throw new Error(
                `Missing param in path: ${key} is defined in controller but not in route`
            );
        }
        const matchingParam = matchedParams.find(p => `:${key}` === p);

        if (!matchingParam) {
            throw new Error(
                `Missing param in path: ${key} is defined in controller but not in route`
            );
        }
    });
};
