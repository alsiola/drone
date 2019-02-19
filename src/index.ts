import * as t from "io-ts";
import express from "express";
import bodyParser = require("body-parser");
import * as Logger from "bunyan";

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
    TAppInjected & {
        body: TBody extends null ? null : t.TypeOf<t.TypeC<TBody>>;
        query: TQuery extends null
            ? never
            : TQuery extends t.Props
            ? t.TypeOf<t.TypeC<TQuery>>
            : never;
        params: TParams extends null
            ? never
            : TParams extends t.Props
            ? t.TypeOf<t.TypeC<TParams>>
            : never;
        logger: Logger;
    };

type Injected<
    TApp extends Record<string, Injection<{}, any>>,
    T extends Record<string, Injection<Injected<{}, TApp>, any>>
> = {
    [K in keyof T]: ReturnType<T[K]> extends Promise<infer ITK>
        ? ITK
        : ReturnType<T[K]>
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

type InjectionArgs<T> = T & { request: express.Request };

export type Injection<T, U> = (a: InjectionArgs<T>) => U;

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
): [boolean, T | null] => {
    if (!shape) {
        return [true, null];
    }

    if (shape.is(candidate)) {
        return [true, candidate];
    }

    return [false, null];
};

export const app = <T extends Record<string, Injection<{}, any>>>({
    inject: appInjectors,
    logger
}: AppArgs<T>) => {
    const expressApp = express();
    expressApp.use(bodyParser.json());

    const injectGlobal = (
        injectors: T & Injection<Injected<{}, T>, any>,
        request: express.Request
    ) => {
        return Object.entries(injectors).reduce((out, [key, injector]) => {
            try {
                (out as any)[key] = injector({ request });
            } catch (err) {
                logger.error({ injector: key, err }, "Error running injector");
            } finally {
                return out;
            }
        }, {});
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
                    const [isBodyValid, validBody] = validate(body, req.body);
                    const [isQueryValid, validQuery] = validate(
                        query,
                        req.query
                    );
                    const [isParamsValid, validParams] = validate(
                        params,
                        req.params
                    );

                    if (!isBodyValid || !isQueryValid || !isParamsValid) {
                        return res.status(400).send("Invalid request");
                    }

                    try {
                        const result = await implement({
                            body: validBody,
                            query: validQuery,
                            params: validParams,
                            logger,
                            ...injectGlobal(
                                {
                                    ...(appInjectors as object),
                                    ...(controllerInjectors as object)
                                } as (T & Injection<Injected<{}, T>, any>),
                                req
                            )
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
        controller: createController,
        use: (controller: Controller<T, any, any, any, any, any>) =>
            controller.use(),
        listen: (port: number) =>
            new Promise(resolve => {
                expressApp.listen(port, resolve);
            })
    };
};

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
