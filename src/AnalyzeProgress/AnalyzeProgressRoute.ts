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
      const progressError = analyzeProgress.progressError;

      if (process && !progressError){
        res.status(200).send(`${process}`);
      }
      else if (progressError) {
        res.status(500).send({
          message: progressError || 'Server error occurred on general log analyze.',
        });
      }
    });
  }
}

export const analyzeProgressRoute = new AnalyzeProgressRoute().router;
