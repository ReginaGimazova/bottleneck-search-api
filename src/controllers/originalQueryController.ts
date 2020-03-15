import OriginalQueryDataStore from "../dataStores/OriginalQueryDataStore";

export const save = () => {
    const originalQueryDataStore = new OriginalQueryDataStore();
    originalQueryDataStore.save();
};