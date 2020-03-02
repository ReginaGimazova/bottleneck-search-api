import {Request, Response} from "express";
import {getAll} from "../controllers/tableStatisticController";

const tableStatistic = app => {
    // retrieve all tables statistic
    app.route('/tables').get((req: Request, res: Response) => {
        getAll(req, res);
    })
};

export default tableStatistic;