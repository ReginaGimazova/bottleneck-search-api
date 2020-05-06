class AnalyzeProgress {
  public progress: 0;

  updateProgress(value){
    this.progress = value;
  }
}

export const analyzeProgress = new AnalyzeProgress();