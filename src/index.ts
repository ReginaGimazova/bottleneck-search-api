import 'reflect-metadata';
import { createConnection } from 'typeorm';

import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const PORT = process.env.PORT || 5000;

createConnection()
  .then(() => {
    const app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
  })
  .catch(error => {
    console.log(error);
  });

export default express;
