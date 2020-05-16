class AnalyzeProgress {
  public progress: 0;

  updateProgress(value){
    this.progress = value;
  }

  queryLogInserted(){
    this.updateProgress(20)
  }

  parametrizedQueriesInserted(){
    this.updateProgress(40)
  }

  filteredQueriesInserted(){
    this.updateProgress(60)
  }

  tablesInserted(){
    this.updateProgress(100)
  }

  explainResultInserted(){
    this.updateProgress(100)
  }
}

export const analyzeProgress = new AnalyzeProgress();