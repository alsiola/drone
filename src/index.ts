import * as t from "io-ts";
import { PathReporter } from "io-ts/lib/PathReporter";
import express from "express";
import bodyParser from "body-parser";
import * as Logger from "bunyan";
import { Right, Either } from "fp-ts/lib/Either";

export enum HTTP_METHOD {
    GET = "get",
    POST = "post"
}

export class RestResult<T> {
    constructor(private status: number = 200, private result?: T) {}

    public send(res: express.Response) {
        res.status(this.status).send(this.result);
    }
}

type ImplementationArgs<
    TBody extends t.Props,
    TQuery extends t.Props | null,
    TParams extends t.Props | null,
    TInjected,
    TAppInjected
> = TInjected &
    TAppInjected &
    (TQuery extends null
        ? {}
        : TQuery extends t.Props
        ? { query: t.TypeOf<t.TypeC<TQuery>> }
        : {}) &
    (TBody extends null
        ? {}
        : TBody extends t.Props
        ? { body: t.TypeOf<t.TypeC<TBody>> }
        : {}) &
    (TParams extends null
        ? {}
        : TParams extends t.Props
        ? { params: t.TypeOf<t.TypeC<TParams>> }
        : {}) & {
        logger: Logger;
    };

type InjectionArgs<T> = T & { request: express.Request };

export type Injection<T, U> = (
    a: InjectionArgs<T>
) => U | RestResult<any> | Promise<RestResult<any>>;

type DePromise<T> = T extends Promise<infer U> ? U : T;

type Injected<
    TApp extends Record<string, Injection<{}, any>>,
    T extends Record<string, Injection<Injected<{}, TApp>, any>>
> = {
    [K in keyof T]: DePromise<
        Exclude<ReturnType<T[K]>, RestResult<any> | Promise<RestResult<any>>>
    >
};

interface ControllerArgs<
    TApp extends Record<string, Injection<{}, any>>,
    TBody extends t.Props,
    TQuery extends t.Props | null,
    TParams extends t.Props | null,
    TInject extends Record<string, Injection<Injected<{}, TApp>, {}>>,
    TResult
> {
    route: string;
    method: HTTP_METHOD;
    body?: TBody extends t.Props ? t.TypeC<TBody> : never;
    query?: TQuery extends t.Props ? t.TypeC<TQuery> : never;
    params?: TParams extends t.Props ? t.TypeC<TParams> : never;
    inject: TInject;
    implement: (
        a: ImplementationArgs<
            TBody,
            TQuery,
            TParams,
            Injected<TApp, TInject>,
            Injected<{}, TApp>
        >
    ) => RestResult<TResult> | Promise<RestResult<TResult>>;
}

type ControllerCreator<TApp extends Record<string, Injection<{}, any>>> = <
    TInject extends Record<string, Injection<Injected<{}, TApp>, {}>>,
    TBody extends t.Props,
    TQuery extends t.Props | null = null,
    TParams extends t.Props | null = null,
    TResult = {}
>(
    a: ControllerArgs<TApp, TBody, TQuery, TParams, TInject, TResult>
) => Controller<TApp, TBody, TQuery, TParams, TInject, TResult>;

interface AppArgs<T> {
    inject: T;
    logger: Logger;
}

const validate = <T extends t.Props>(
    shape: t.TypeC<T> | undefined,
    candidate: unknown
): Either<t.Errors, T | null> => {
    if (!shape) {
        return new Right(null);
    }

    return shape.validate(candidate, []);
};

const reduceAsync = <T, U>(
    a: T[],
    seed: U,
    f: (a: U, b: T) => U
): Promise<U> => {
    return a.reduce(async (prev, next) => {
        const result = await prev;
        return f(result, next);
    }, Promise.resolve(seed));
};

export type Drone = ReturnType<typeof app>;

export const app = <T extends Record<string, Injection<{}, any>>>({
    inject: appInjectors,
    logger
}: AppArgs<T>) => {
    const expressApp = express();
    expressApp.use(bodyParser.json());

    const runInjectors = (
        injectors: T & Injection<Injected<{}, T>, any>,
        request: express.Request
    ) => {
        return reduceAsync(
            Object.entries(injectors),
            {},
            async (out, [key, injector]) => {
                try {
                    if (out instanceof RestResult) {
                        return out;
                    }
                    const injectorResult = await injector({ request, ...out });
                    if (injectorResult instanceof RestResult) {
                        return injectorResult;
                    }
                    (out as any)[key] = injectorResult;
                    return out;
                } catch (err) {
                    logger.error(
                        { injector: key, err },
                        "Error running injector"
                    );
                    return out;
                }
            }
        );
    };

    const createController: ControllerCreator<T> = ({
        route,
        method,
        body,
        params,
        query,
        inject: controllerInjectors,
        implement
    }) => {
        return {
            use: () => {
                expressApp[method](route, async (req, res) => {
                    const bodyResult = validate(body, req.body);
                    const queryResult = validate(query, req.query);
                    const paramsResult = validate(params, req.params);

                    const errors = {
                        ...(bodyResult.isLeft() && {
                            body: PathReporter.report(bodyResult)
                        }),
                        ...(queryResult.isLeft() && {
                            query: PathReporter.report(queryResult)
                        }),
                        ...(paramsResult.isLeft() && {
                            params: PathReporter.report(paramsResult)
                        })
                    };

                    if (Object.keys(errors).length > 0) {
                        return new RestResult(400, { errors }).send(res);
                    }

                    try {
                        const injectionResult = await runInjectors(
                            {
                                ...(appInjectors as object),
                                ...(controllerInjectors as object)
                            } as (T & Injection<Injected<{}, T>, any>),
                            req
                        );

                        if (injectionResult instanceof RestResult) {
                            return injectionResult.send(res);
                        }

                        const result = await implement({
                            body: bodyResult.value,
                            query: queryResult.value,
                            params: paramsResult.value,
                            logger,
                            ...injectionResult
                        } as any);

                        result.send(res);
                    } catch (err) {
                        logger.error(
                            { err, route, method },
                            "Controller failed"
                        );
                        res.status(500).send("Error");
                    }
                });
            },
            test: args => implement(args)
        };
    };
    return {
        /**
         * Create a new drone controller
         */
        controller: createController,
        use: (usable: Usable) => usable.use(),
        listen: (port: number) =>
            new Promise(resolve => {
                expressApp.listen(port, resolve);
            }),
        module: (...controllers: Controller<T, any, any, any, any, any>[]) => ({
            use: () => controllers.forEach(controller => controller.use())
        })
    };
};

interface Usable {
    use: () => void;
}

interface Controller<
    TApp extends Record<string, Injection<{}, any>>,
    TBody extends t.Props,
    TQuery extends t.Props | null,
    TParams extends t.Props | null,
    TInject extends Record<string, Injection<Injected<{}, TApp>, {}>>,
    TResult
> {
    use: () => void;
    test: (
        a: ImplementationArgs<
            TBody,
            TQuery,
            TParams,
            Injected<TApp, TInject>,
            Injected<{}, TApp>
        >
    ) => RestResult<TResult> | Promise<RestResult<TResult>>;
}
