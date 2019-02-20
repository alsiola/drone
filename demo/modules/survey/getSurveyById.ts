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
    implement: ({ body, user, i18n, logger }) => {
        logger.info("getSurveyById");
        return new RestResult(200, {
            survey: { id: body.surveyId },
            user: i18n.translate(user.name)
        });
    }
});
