import {Request, Response} from "express";
import {getAll} from "../controllers/suitableQueryController";

const queries = app => {
  // retrieve all suitable queries
  app.route('/queries').get(async (req: Request, res: Response) => {
      await getAll(req, res);
  })
};

export default queries;