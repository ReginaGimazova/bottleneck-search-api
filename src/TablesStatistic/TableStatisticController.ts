import TablesStatisticDataStore from './TablesStatisticDataStore';

export class TableStatisticController {
  public getAll = (req, res) => {
    const tableStatisticDataStore = new TablesStatisticDataStore();

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
