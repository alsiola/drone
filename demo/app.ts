import { app } from "../src";
import { user } from "./injectors";

export const drone = app({
    logger: {
        info: console.log
    },
    inject: {
        user
    }
});
