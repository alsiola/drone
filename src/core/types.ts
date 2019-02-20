import * as Logger from "bunyan";
import * as t from "io-ts";
import * as express from "express";
import { RestResult } from "./RestResult";
import { HTTP_METHOD } from "./httpMethod";

export type ImplementationArgs<
    TBody extends t.Props | null,
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

export type InjectionArgs<T> = T & { request: express.Request };

export type Injection<T, U> = (
    a: InjectionArgs<T>
) => U | RestResult<any> | Promise<RestResult<any>>;

export type UnWrap<T> = T extends Promise<infer U> ? U : T;

export type Injected<
    TApp extends Record<string, Injection<{}, any>>,
    T extends Record<string, Injection<Injected<{}, TApp>, any>>
> = {
    [K in keyof T]: UnWrap<
        Exclude<ReturnType<T[K]>, RestResult<any> | Promise<RestResult<any>>>
    >
};

export interface ControllerArgs<
    TApp extends Record<string, Injection<{}, any>>,
    TBody extends t.Props | null,
    TQuery extends t.Props | null,
    TParams extends t.Props | null,
    TInject extends Record<string, Injection<Injected<{}, TApp>, {}>>,
    TResult
> {
    path: string;
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

export type ControllerCreator<
    TApp extends Record<string, Injection<{}, any>>
> = <
    TInject extends Record<string, Injection<Injected<{}, TApp>, {}>>,
    TBody extends t.Props | null = null,
    TQuery extends t.Props | null = null,
    TParams extends t.Props | null = null,
    TResult = {}
>(
    a: ControllerArgs<TApp, TBody, TQuery, TParams, TInject, TResult>
) => Controller<TApp, TBody, TQuery, TParams, TInject, TResult>;

export interface AppArgs<T> {
    inject: T;
    logger: Logger;
}

export interface Usable {
    use: () => void;
}

export interface Controller<
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
