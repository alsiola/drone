import { HTTP_METHOD, RestResult } from "../../../src";
import * as t from "io-ts";
import { drone } from "../../app";
import { i18n } from "../../injectors";

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
        logger.info(`A message from ${user.id}`);

        i18n.translate("test");

        return new RestResult({ survey: { id: surveyId } });
    }
});
