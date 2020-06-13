import TablesStatisticDataStore from './TablesStatisticDataStore';
import {checkTableInDatabase} from "../helpers/CheckTableInDatabase";

export class TableStatisticController {
  public getAll = (req, res) => {
    const tableStatisticDataStore = new TablesStatisticDataStore();

    checkTableInDatabase.checkTable({
      tableName: 'tables_statistic',
      callbackCheckTable: existCheckResult => {
        if (!existCheckResult) {
          res.status(200).send([]);
          return;
        }
      },
    });

    tableStatisticDataStore.getAll((data, err) => {
      if (err)
        res.status(500).send({
          message:
            err.message ||
            'Server error occurred while retrieving table statistic.',
        });
      else res.status(200).send(data);
    });
  };
}

export const tableStatisticController = new TableStatisticController();
