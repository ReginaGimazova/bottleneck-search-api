import ExplainQueriesDataStore from './ExplainQueriesDataStore';
import ControllerBase from '../helpers/ControllerBase';
import { checkTableInDatabase } from '../helpers/CheckTableInDatabase';
import databasePrepare from '../Initial/DatabasePrepare';

export class ExplainQueriesController extends ControllerBase {

  private getExplainInfoIfSuccess = async (req, res) => {
    const explainQueriesDataStore = new ExplainQueriesDataStore();
    const { page, limit, tables } = this.parseRequest(req);

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

  public update = async (req, res) => {
    const explainQueriesDataStore = new ExplainQueriesDataStore();
    await databasePrepare.truncateCurrentTable('explain_replay_info');

    await explainQueriesDataStore.updateExplainResult(async (data, error) => {
      if (error)
        res.status(500).send({
          message:
            error.message ||
            'Error occurred on the server while receiving explain info data.',
        });
      else {
        await this.getExplainInfoIfSuccess(req, res)
      }
    });
  }

  public getAll = async (req, res) => {
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

    await this.getExplainInfoIfSuccess(req, res)
  };
}

export const explainQueriesController = new ExplainQueriesController();
