import * as express from 'express';
import { configurationController } from './StatusesConfigurationController';

class StatusesConfigurationRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', (req: express.Request, res: express.Response) =>
      configurationController.getAll(req, res)
    );

    this.router.post('/', (req: express.Request, res: express.Response) =>
      configurationController.save(req, res)
    );
  }
}

export const configurationRoutes = new StatusesConfigurationRoutes().router;
