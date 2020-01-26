import { createConnection } from 'typeorm';

import app from './app';
const PORT = process.env.PORT || 5000;

createConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log('listening on port ' + PORT);
    });

  })
  .catch(error => {
    console.log(error);
  });
