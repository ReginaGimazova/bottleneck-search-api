import * as express from 'express';
import { initialController } from './InitialController';

class InitialRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.post('/', (req: express.Request, res: express.Response) => {
      res.sendStatus(200);
      initialController.init();
    });
  }
}

export const initialRoutes = new InitialRoutes().router;
