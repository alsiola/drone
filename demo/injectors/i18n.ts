import { Injection } from "../../src";

type I18n = Injection<
    { user: { name: string; id: string } },
    Promise<{ translate: (a: string) => string }>
>;

export const i18n: I18n = ({ user }) =>
    Promise.resolve({
        translate: (a: string) => user.id
    });
