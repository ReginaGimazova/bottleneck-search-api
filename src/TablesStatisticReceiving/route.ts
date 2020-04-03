import { Request, Response } from 'express';
import { getAll } from './TableStatisticController';

const route = app => {
  app.route('/tables').get((req: Request, res: Response) => {
    getAll(req, res);
  });
};

export default route;
