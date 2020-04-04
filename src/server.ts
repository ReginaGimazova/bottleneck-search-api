import app from './app';
import {save} from "./QueriesFiltering/SuitableQueryController";
import {save as originalSave} from './QueryLogImporting/OriginalQueryController';

const PORT = process.env.PORT || 5000;

app.listen(PORT);

// originalSave();
save();
