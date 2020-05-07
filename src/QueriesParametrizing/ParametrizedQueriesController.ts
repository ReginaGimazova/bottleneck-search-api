import { Request, Response } from 'express';
import ParametrizedQueriesDataStore from './ParametrizedQueriesDataStore';

export class ParametrizedQueriesController {
  public getQueries(req: Request, res: Response) {
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();
    const byHost = JSON.parse(req.query.host);
    const tables = JSON.parse(req.query.search_tables);
    let page = JSON.parse(req.query.page);

    const limit = 10;

    parametrizedQueriesDataStore.getAll({byHost, tables: tables || [], callback: (data, err) => {
      if (err)
        res.status(404).send({
          message:
            err.message ||
            'Server error occurred while retrieving parametrized queries.',
        });
      else {
        const pageCount = Math.ceil(data.length / 10);
        // tslint:disable-next-line:radix
        if (!page) { page = 1;}
        if (page > pageCount) {
          page = pageCount
        }
        res.status(200).send({
          page,
          page_count: pageCount,
          queries: data.slice(page * limit - limit, page * limit)
        });
      }
    }});
  }
}

export const parametrizedQueriesController = new ParametrizedQueriesController();
