import { createConnection } from 'typeorm';

import app from './app';
import {getOriginalQuery} from "./testSelectQuery";
const PORT = process.env.PORT || 5000;

createConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log('listening on port ' + PORT);
      getOriginalQuery();
    });

  })
  .catch(error => {
    console.log(error);
  });
