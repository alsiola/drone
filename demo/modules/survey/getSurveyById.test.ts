import { RestResult, createMockLogger } from "../../../src";
import { getSurveyById } from "./getSurveyById";

describe("getSurveyById", () => {
    let i18n: any;
    let logger: any;
    let spies: Record<"info", jest.Mock<any, any>>;

    beforeEach(() => {
        const mockLoggerAndSpies = createMockLogger("info");
        logger = mockLoggerAndSpies.logger;
        spies = mockLoggerAndSpies.spies;

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
            },
            params: {
                name: "Pete"
            }
        });

        const expected = new RestResult(200, {
            survey: { id: "12" },
            user: "Alex",
            name: "Pete"
        });

        expect(actual).toEqual(expected);
        expect(spies.info).toBeCalledWith("getSurveyById");
    });
});
