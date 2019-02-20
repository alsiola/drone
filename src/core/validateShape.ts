import * as t from "io-ts";
import { Right, Either } from "fp-ts/lib/Either";

export const validateShape = <T extends t.Props>(
    shape: t.TypeC<T> | undefined,
    candidate: unknown
): Either<t.Errors, T | null> => {
    if (!shape) {
        return new Right(null);
    }

    return shape.validate(candidate, []);
};
