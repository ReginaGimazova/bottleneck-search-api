import { Request } from 'express';

/**
 * Used for controllers which use pagination and search tables
 * (ParametrizedQueriesController, ExplainQueriesController, ProfileQueriesController)
 */
class ControllerBase {
  public parseRequest(req: Request){
    const {query} = req;
    const byHost = req.query.byHost ? JSON.parse(query.byHost) : false;
    const tables = req.query.search_tables ? JSON.parse(query.search_tables) : [];
    const page = JSON.parse(query.page);

    const limit = 10;

    return {byHost, tables, page, limit};
  }
}

export default ControllerBase;