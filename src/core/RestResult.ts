import { Response } from "express";

export class RestResult<T> {
    constructor(private status: number = 200, private result?: T) {}

    public send(res: Response) {
        res.status(this.status).send(this.result);
    }
}
