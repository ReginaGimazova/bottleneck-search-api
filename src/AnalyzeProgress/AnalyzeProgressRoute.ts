import * as express from 'express';
import analyzeProgressController from "./AnalyzeProgressController";

class AnalyzeProgressRoute {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', async (req: express.Request, res: express.Response) => {
      await analyzeProgressController.getProgress(req, res);
    });
  }
}

export const analyzeProgressRoute = new AnalyzeProgressRoute().router;
