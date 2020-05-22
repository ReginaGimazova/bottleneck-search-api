import ProfileQueriesDataStore from "./ProfileQueriesDataStore";

export class ProfileQueriesController {
  public getAll = async (req, res) => {
    const profileQueriesDataStore = new ProfileQueriesDataStore();
    //const tables = JSON.parse(req.query.search_tables);
    let page = JSON.parse(req.query.page);

    await profileQueriesDataStore.getProfileInfo([],(data, err) => {
      if (err)
        res.status(500).send({
          message: err.message || "Server error occurred while retrieving profile info."
        });
      else res.status(200).send(data);
    });
  };
}

export const profileQueriesController = new ProfileQueriesController();