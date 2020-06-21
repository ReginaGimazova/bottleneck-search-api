import { Request, Response } from 'express';
import ParametrizedQueriesDataStore from './ParametrizedQueriesDataStore';
import ControllerBase from '../helpers/ControllerBase';
import {checkTableInDatabase} from "../helpers/CheckTableInDatabase";

export class ParametrizedQueriesController extends ControllerBase {
  public getQueries(req: Request, res: Response) {
    const parametrizedQueriesDataStore = new ParametrizedQueriesDataStore();

    const {byHost, limit, page = 1, tables} = this.parseRequest(req);

    checkTableInDatabase.checkTable({
      tableName: 'parametrized_queries',
      callbackCheckTable: existCheckResult => {
        if (!existCheckResult) {
          res.status(200).send({
            page: 0,
            pageCount: 0,
            queries: [],
          });

          return;
        }
      },
    });

    parametrizedQueriesDataStore.getAll({byHost, tables: tables || [], callback: (data, err) => {
      if (err)
        res.status(404).send({
          message:
            err.message ||
            'Server error occurred while receiving parametrized queries.',
        });
      else {
        const pageCount = Math.ceil(data.length / 10);

        res.status(200).send({
          page: page > pageCount ? pageCount : page,
          pageCount,
          queries: data.slice(page * limit - limit, page * limit)
        });
      }
    }});
  }
}

export const parametrizedQueriesController = new ParametrizedQueriesController();
