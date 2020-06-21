import * as express from 'express';
import { filteredQueryController } from './FilteredQueryController';

class FilteredQueriesRoute {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', async (req: express.Request, res: express.Response) => {
      await filteredQueryController.getByStatusId(req, res)
    });
  }
}

export const filteredQueriesRoute = new FilteredQueriesRoute().router;
