import * as t from "io-ts";

export enum HTTP_METHOD {
    GET = "GET",
    POST = "POST"
}

export class RestResult<T> {
    constructor(private result?: T) {}
}

interface Logger {
    info: (msg?: string) => void;
}

type ImplementationArgs<
    TBody extends t.Props | null,
    TQuery extends t.Props | null,
    TParams extends t.Props | null,
    TInjected,
    TAppInjected
> = TInjected &
    TAppInjected & {
        body: TBody extends null
            ? never
            : TBody extends t.Props
            ? t.TypeOf<t.TypeC<TBody>>
            : never;
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
    TBody extends t.Props | null,
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

type InjectionArgs<T> = T & {
    request: { path: "string" };
};

export type Injection<T, U> = (a: InjectionArgs<T>) => U;

type ControllerCreator<TApp extends Record<string, Injection<{}, any>>> = <
    TInject extends Record<string, Injection<Injected<{}, TApp>, {}>>,
    TBody extends t.Props | null = null,
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

export const app = <T extends Record<string, Injection<{}, any>>>(
    a: AppArgs<T>
) => {
    return {
        controller: ({} as any) as ControllerCreator<T>,
        listen: (port: number) => Promise.resolve()
    };
};

interface Controller<
    TApp extends Record<string, Injection<{}, any>>,
    TBody extends t.Props | null,
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
