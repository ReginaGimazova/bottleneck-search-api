import * as express from 'express';
import { tableStatisticController } from './TableStatisticController';

class TableStatisticRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', (req: express.Request, res: express.Response) =>
      tableStatisticController.getAll(req, res)
    );
  }
}

export const tableStatisticRoutes = new TableStatisticRoutes().router;