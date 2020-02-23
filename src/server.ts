import app from './app';
import {save} from "./controllers/suitableQueryController";
import RejectedQueryDataStore from './dataStores/RejectedQueryDataStore';
import OriginalQueryDataStore from './dataStores/OriginalQueryDataStore';

const PORT = process.env.PORT || 5000;

app.listen(PORT);

save();
// originalQueryDataStore.save();
// suitableQueryDataStore.save();
// rejectedOriginalQueries.save();
