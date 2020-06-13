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
      configurationController.update(req, res)
    );

    this.router.post('/new', (req: express.Request, res: express.Response) =>
      configurationController.addStatus(req, res)
    );

    this.router.post('/remove', (req: express.Request, res: express.Response) =>
      configurationController.removeStatus(req, res)
    )
  }
}

export const configurationRoutes = new StatusesConfigurationRoutes().router;
