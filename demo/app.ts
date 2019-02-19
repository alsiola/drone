import { app } from "../src";
import { user } from "./injectors";
import { logger } from "./logger";

export const drone = app({
    logger,
    inject: {
        user
    }
});
