import * as t from "io-ts";
import { app, HTTP_METHOD, RestResult, Injection } from "../src";

type User = Injection<{}, { name: string; id: string}>

const user: User = ({
    request
}) => ({
        id: "333",
        name: request.path
});

const drone = app({
    inject: {
        user
    }
});

type I18n = Injection<{ user: { name: string; id: string} }, { translate: (a: string) => string }>

const i18n: I18n = ({
    request,
    user
}) => ({
    translate: (a: string) => user.id
});

const body = t.interface({
    surveyId: t.string
});

export const getSurveyById = drone.controller({
    route: "/",
    method: HTTP_METHOD.GET,
    body,
    inject: {
        i18n
    },
    implement: ({ body: { surveyId }, logger, i18n, user }) => {
        logger.info("A message");
        return new RestResult({ survey: { id: surveyId } });
    }
});
