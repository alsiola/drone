import { app, Drone, RestResult } from "../../../src";
import { getSurveyById } from "./getSurveyById";

describe("getSurveyById", () => {
    let logger: any;
    let i18n: any;

    beforeEach(() => {
        logger = new Proxy(
            {},
            {
                get(target, prop) {
                    return (...msg: any[]) => console.log(String(prop), ...msg);
                }
            }
        );

        i18n = {
            translate: (a: string) => a
        };
    });

    it("is testable", async () => {
        const actual = await getSurveyById.test({
            i18n,
            logger,
            body: {
                surveyId: "12"
            },
            user: {
                id: "1",
                name: "Alex"
            }
        });

        const expected = new RestResult(200, {
            survey: { id: "12" },
            user: "Alex"
        });

        expect(actual).toEqual(expected);
    });
});
