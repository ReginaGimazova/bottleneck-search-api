import {Request, Response} from "express";
import {getAll} from "./SuitableQueryController";

const queries = app => {
  app.route('/queries').get(async (req: Request, res: Response) => {
      await getAll(req, res);
  })
};

export default queries;