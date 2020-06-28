import SimpleLogger from 'simple-node-logger';

class Logger {
  public settings;

  constructor() {
    const opts = {
      logFilePath: 'logs.log',
      timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    };

    this.settings = SimpleLogger.createSimpleLogger(opts)
  }

  setLevel(level){
    this.settings.setLevel(level)
  }

  logError(errorMessage: string){
    this.settings.setLevel('error')
    this.settings.error(errorMessage)
  }

  logInfo(infoMessage: string){
    this.settings.setLevel('info');
    this.settings.info(infoMessage);
  }
}

export const logger = new Logger();
