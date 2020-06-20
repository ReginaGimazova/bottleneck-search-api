import { analyzeProgress } from './AnalyzeProgress';

class AnalyzeProgressController {
  async getProgress(req, res) {
    try {
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