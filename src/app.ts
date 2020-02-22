import express from 'express';
import * as bodyParser from 'body-parser'; // can use only for set configuration, otherwise remove this dependency
import cors from 'cors';
import helmet from 'helmet';
import 'reflect-metadata';
import queries from './routes/queries';

class App {
  public app: express.Application;

  constructor() {
    this.app = express(); // run the express instance and store in app
    this.config();
    queries(this.app);
  }

  private config(): void {
    // support application/json type post data
    this.app.use(bodyParser.json());

    // support application/x-www-form-urlencoded post data
    this.app.use(
      bodyParser.urlencoded({
        extended: false,
      })
    );
    this.app.use(helmet());
    this.app.use(cors());
  }
}

export default new App().app;