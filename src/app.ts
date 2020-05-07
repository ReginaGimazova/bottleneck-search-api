import express from 'express';
import paginate from 'express-paginate';
import * as bodyParser from 'body-parser'; // can use only for set configuration, otherwise remove this dependency
import cors from 'cors';
import helmet from 'helmet';
import 'reflect-metadata';

import {configurationRoutes} from "./StatusesConfiguration/StatusesConfigurationRoutes";
import {tableStatisticRoutes} from "./TablesStatistic/TableStatisticRoutes";
import {parametrizedQueriesRoutes} from './QueriesParametrizing/ParametrizedQueriesRoutes';
import {initialRoutes} from "./Initial/InitialRoutes";
import {analyzeProgressRoute} from './AnalyzeProgress/AnalyzeProgressRoute';

class App {
  public app: express.Application;

  constructor() {
    this.app = express(); // run the express instance and store in app
    this.config();
  }

  private config(): void {
    this.app.use(paginate.middleware(10, 50));

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

    this.app.use('/configuration', configurationRoutes);
    this.app.use('/tables', tableStatisticRoutes);
    this.app.use('/queries', parametrizedQueriesRoutes);
    this.app.use('/start', initialRoutes);
    this.app.use('/progress', analyzeProgressRoute);
  }
}

export default new App().app;