import SimpleLogger from 'simple-node-logger';

class Logger {
  public logger;

  constructor() {
    const opts = {
      logFilePath: 'logs.log',
      timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    };

    this.logger = SimpleLogger.createSimpleLogger(opts)
  }

  setLevel(level){
    this.logger.setLevel(level)
  }

  logError(errorMessage: string){
    this.logger.error(errorMessage)
  }
}

export default Logger;
