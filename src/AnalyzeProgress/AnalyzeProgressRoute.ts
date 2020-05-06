import * as express from 'express';
import { analyzeProgress } from './AnalyzeProgress';

class AnalyzeProgressRoute {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', (req: express.Request, res: express.Response) => {
      const process = analyzeProgress.progress;
      res.status(200).send(`${process}`);
    });
  }
}

export const analyzeProgressRoute = new AnalyzeProgressRoute().router;
