import {Response, Request, Router} from 'express';
import { explainQueriesController } from './ExplainQueriesController';

class ExplainQueriesRoutes {
  public router: Router = Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', async (req: Request, res: Response) => {
      await explainQueriesController.getAll(req, res);
    });

    this.router.post('/update', async (req: Request, res: Response ) => {
      await explainQueriesController.update(req, res);
    })
  }
}

export const explainQueriesRoutes = new ExplainQueriesRoutes().router;
