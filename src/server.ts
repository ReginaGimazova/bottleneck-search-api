import app from './app';
import SuitableQueryDataStore from "./dataStores/SuitableQueryDataStore";
import RejectedQueryDataStore from './dataStores/RejectedQueryDataStore';
import OriginalQueryDataStore from './dataStores/OriginalQueryDataStore';

const PORT = process.env.PORT || 5000;

app.listen(PORT);

const suitableQueryDataStore = new SuitableQueryDataStore();
const rejectedOriginalQueries = new RejectedQueryDataStore();
const originalQueryDataStore = new OriginalQueryDataStore();

// originalQueryDataStore.save();
// suitableQueryDataStore.save();
// rejectedOriginalQueries.save();
