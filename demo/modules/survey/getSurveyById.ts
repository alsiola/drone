import { HTTP_METHOD, RestResult } from "../../../src";
import * as t from "io-ts";
import { drone } from "../../app";
import { i18n } from "../../injectors";

const body = t.interface({
    surveyId: t.string
});

const params = t.interface({
    name: t.string
});

export const getSurveyById = drone.controller({
    path: "/:name",
    method: HTTP_METHOD.GET,
    body,
    params,
    inject: {
        i18n
    },
    implement: ({
        body: { surveyId },
        user,
        i18n,
        logger,
        params: { name }
    }) => {
        logger.info("getSurveyById");
        return new RestResult(200, {
            survey: { id: surveyId },
            user: i18n.translate(user.name),
            name
        });
    }
});
