class AnalyzeProgress {
  public progress: 0;

  updateProgress(value){
    this.progress = value;
  }

  queryLogInserted(){
    this.updateProgress(100 / 6)
  }

  parametrizedQueriesInserted(){
    this.updateProgress(100 / 6 * 2)
  }

  filteredQueriesInserted(){
    this.updateProgress(100 / 6 * 3)
  }

  tablesInserted(){
    this.updateProgress(100 / 6 * 4)
  }

  explainResultInserted(){
    this.updateProgress(100 / 6 * 5)
  }

  profileResultInserted(){
    this.updateProgress(100)
  }
}

export const analyzeProgress = new AnalyzeProgress();