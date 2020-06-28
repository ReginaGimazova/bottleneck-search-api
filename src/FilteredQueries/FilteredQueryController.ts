import {checkTableInDatabase} from "../Initial/CheckTableInDatabase";
import FilteredQueryDataStore from "./FilteredQueryDataStore";

export class FilteredQueryController {
  public getByStatusId = async (req, res) => {
    const filteredQueryDataStore = new FilteredQueryDataStore();
    const statusId = +req.query.statusId;
    const type = req.query.type;

    const existCheckResult = await checkTableInDatabase.checkTable('filtered_queries');

    if (!existCheckResult) {
      res.status(200).send([]);
      return;
    }

    await filteredQueryDataStore.getByStatusId({statusId, type, getQueryCallback: (data, err) => {
      if (err)
        res.status(500).send({
          message:
            err.message});
      else res.status(200).send(data);
    }});
  };
}

export const filteredQueryController = new FilteredQueryController();
