/**
 * This class used for update progress on query log analyze for show progress bar on frontend app view
 */

// rename
class AnalyzeProgress {
  public progress = 0;
  public progressError: string;
  private analyzeStepsCount = 6;

  updateProgress(value){
    this.progress = value;
  }

  queryLogInserted(){
    this.updateProgress(100 / this.analyzeStepsCount)
  }

  parametrizedQueriesInserted(){
    this.updateProgress(100 / this.analyzeStepsCount * 2)
  }

  filteredQueriesInserted(){
    this.updateProgress(100 / this.analyzeStepsCount * 3)
  }

  tablesInserted(){
    this.updateProgress(100 / this.analyzeStepsCount * 4)
  }

  explainResultInserted(){
    this.updateProgress(100 / this.analyzeStepsCount * 5)
  }

  profileResultInserted(){
    this.updateProgress(100)
  }

  handleErrorOnLogAnalyze(error){
    this.progress = 0;
    this.progressError = error;
  }
}

export const analyzeProgress = new AnalyzeProgress();