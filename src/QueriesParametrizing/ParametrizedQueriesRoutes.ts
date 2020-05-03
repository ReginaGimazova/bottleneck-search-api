import * as express from 'express';
import { parametrizedQueriesController } from './ParametrizedQueriesController';

class ParametrizedQueriesRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', (req: express.Request, res: express.Response) => {
      parametrizedQueriesController.getQueries(req, res)
    });
  }
}

export const parametrizedQueriesRoutes = new ParametrizedQueriesRoutes().router;
