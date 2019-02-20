import { Injection } from "../../src";

type User = Injection<{}, { name: string; id: string }>;

export const user: User = ({ request }) => ({
    id: request.body.userId,
    name: request.path
});
