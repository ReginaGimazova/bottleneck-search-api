import { Request, Response } from 'express';
import ParametrizedQueriesDataStore from './ParametrizedQueriesDataStore';

export class ParametrizedQueriesController {
  public getQueries(req: Request, res: Response) {
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();
    const byHost = JSON.parse(req.query.host);
    const tables = JSON.parse(req.query.search_tables);

    parametrizedQueriesDataStore.getAll({byHost, tables: tables || [], callback: (data, err) => {
      if (err)
        res.status(404).send({
          message:
            err.message ||
            'Server error occurred while retrieving parametrized queries.',
        });
      else res.status(200).send(data);
    }});
  }
}

export const parametrizedQueriesController = new ParametrizedQueriesController();
