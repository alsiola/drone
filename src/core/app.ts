import { PathReporter } from "io-ts/lib/PathReporter";
import express from "express";
import bodyParser from "body-parser";
import {
    Injection,
    AppArgs,
    Injected,
    ControllerCreator,
    Usable,
    Controller
} from "./types";
import { reduceAsync } from "./util";
import { RestResult } from "./RestResult";
import { validateParams } from "./validateParams";
import { validateShape } from "./validateShape";

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
        path: route,
        method,
        body,
        params,
        query,
        inject: controllerInjectors,
        implement
    }) => {
        if (params) {
            validateParams(route, params);
        }
        return {
            use: () => {
                expressApp[method](route, async (req, res) => {
                    const bodyResult = validateShape(body, req.body);
                    const queryResult = validateShape(query, req.query);
                    const paramsResult = validateShape(params, req.params);

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
