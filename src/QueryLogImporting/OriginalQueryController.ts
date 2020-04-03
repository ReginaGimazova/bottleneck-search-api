import OriginalQueryDataStore from "./OriginalQueryDataStore";

export const save = () => {
    const originalQueryDataStore = new OriginalQueryDataStore();
    originalQueryDataStore.save();
};