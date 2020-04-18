import * as express from 'express';
import { initialController } from './InitialController';

class InitialRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.post('/', () =>
      initialController.init()
    );
  }
}

export const initialRoutes = new InitialRoutes().router;
