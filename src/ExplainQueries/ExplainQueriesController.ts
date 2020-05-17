import ExplainQueriesDataStore from "./ExplainQueriesDataStore";

export class ExplainQueriesController {
  public getAll = (req, res) => {
    const explainQueriesDataStore = new ExplainQueriesDataStore();
    //const tables = JSON.parse(req.query.search_tables);
    let page = JSON.parse(req.query.page);

    explainQueriesDataStore.getExplainInfo([],(data, err) => {
      if (err)
        res.status(500).send({
          message: err.message || "Server error occurred while retrieving explain info."
        });
      else res.status(200).send(data);
    });
  };
}

export const explainQueriesController = new ExplainQueriesController();