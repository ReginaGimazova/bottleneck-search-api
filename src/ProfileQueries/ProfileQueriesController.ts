import ProfileQueriesDataStore from "./ProfileQueriesDataStore";
import ControllerBase from "../helpers/ControllerBase";
import {checkTableInDatabase} from "../helpers/CheckTableInDatabase";

export class ProfileQueriesController extends ControllerBase {
  public getAll = async (req, res) => {
    const profileQueriesDataStore = new ProfileQueriesDataStore();
     const {page, tables, limit} = this.parseRequest(req);

    checkTableInDatabase.checkTable({
      tableName: 'profile_replay_info',
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

    await profileQueriesDataStore.getProfileInfo([],(data, err) => {
      if (err)
        res.status(500).send({
          message: err.message || "Server error occurred while retrieving profile info."
        });
      else {
        const pageCount = Math.ceil(data.length / 10);
        res.status(200).send({
          page: page > pageCount ? pageCount : page,
          page_count: pageCount,
          queries: data.slice(page * limit - limit, page * limit)
        });
      }
    });
  };
}

export const profileQueriesController = new ProfileQueriesController();