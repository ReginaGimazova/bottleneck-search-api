import app from './app';
import {save} from "./controllers/suitableQueryController";
import {save as originalSave} from './controllers/originalQueryController';

const PORT = process.env.PORT || 5000;

app.listen(PORT);

//originalSave();
save();
