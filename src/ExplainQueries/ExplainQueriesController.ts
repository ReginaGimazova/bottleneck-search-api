import ExplainQueriesDataStore from './ExplainQueriesDataStore';
import ControllerBase from '../helpers/ControllerBase';
import { checkTableInDatabase } from '../helpers/CheckTableInDatabase';

export class ExplainQueriesController extends ControllerBase {
  public getAll = async (req, res) => {
    const explainQueriesDataStore = new ExplainQueriesDataStore();

    const { page, limit, tables } = this.parseRequest(req);

    checkTableInDatabase.checkTable({
      tableName: 'explain_replay_info',
      callbackCheckTable: existCheckResult => {
        if (!existCheckResult) {
          res.status(200).send({
            page: 0,
            page_count: 0,
            queries: [],
          });

          return;
        }
      },
    });

    await explainQueriesDataStore.getExplainInfo(tables, (data, err) => {
      if (err)
        res.status(500).send({
          message:
            err.message ||
            'Error occurred on the server while receiving explain info data.',
        });
      else {
        const pageCount = Math.ceil(data.length / 10);
        res.status(200).send({
          page: page > pageCount ? pageCount : page,
          page_count: pageCount,
          queries: data.slice(page * limit - limit, page * limit),
        });
      }
    });
  };
}

export const explainQueriesController = new ExplainQueriesController();
