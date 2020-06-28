import { analyzeProgress } from './AnalyzeProgress';
import {checkTableInDatabase} from "../Initial/CheckTableInDatabase";

class AnalyzeProgressController {
  async getProgress(req, res) {
    try {
      const existCheckResult = await checkTableInDatabase.checkTable('application_info');

      if (!existCheckResult) {
        res.status(200).send(0);
        return;
      }

      const progress = await analyzeProgress.getCurrentProgress(null);
      res.status(200).send(progress[0]);
    } catch (e) {
      res.status(500).send({
        message: e.message,
      });
    }
  }
}

const analyzeProgressController = new AnalyzeProgressController();
export default analyzeProgressController;