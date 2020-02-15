import app from './app';
import { DataStore } from "./DataStore";
const PORT = process.env.PORT || 5000;

app.listen(PORT);

const dataStore = new DataStore();
dataStore.save();

dataStore.getSuitableQueries();
