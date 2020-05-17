import * as express from 'express';
import { profileQueriesController } from './ProfileQueriesController';

class ProfileQueriesRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', (req: express.Request, res: express.Response) => {
      profileQueriesController.getAll(req, res)
    });
  }
}

export const profileQueriesRoutes = new ProfileQueriesRoutes().router;
