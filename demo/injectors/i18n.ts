import { Injection, RestResult } from "../../src";

type I18n = Injection<
    { user: { name: string; id: string } },
    Promise<{ translate: (a: string) => string }>
>;

export const i18n: I18n = ({ user }) => {
    if (user.id === "4") {
        return new RestResult(400, "Bad user id");
    }
    return Promise.resolve({
        translate: (a: string) => a
    });
};
