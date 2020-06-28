import TablesStatisticDataStore from './TablesStatisticDataStore';
import {checkTableInDatabase} from "../Initial/CheckTableInDatabase";

export class TableStatisticController {
  public getAll = async (req, res) => {
    const tableStatisticDataStore = new TablesStatisticDataStore();

    const existCheckResult = await checkTableInDatabase.checkTable('tables_statistic');

    if (!existCheckResult) {
      res.status(200).send([]);
      return;
    }

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
