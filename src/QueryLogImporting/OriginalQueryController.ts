import OriginalQueryDataStore from './OriginalQueryDataStore';

export class OriginalQueryController {
  public save = () => {
    const originalQueryDataStore = new OriginalQueryDataStore();
    originalQueryDataStore.save();
  };
}

export const originalQueryController = new OriginalQueryController();
