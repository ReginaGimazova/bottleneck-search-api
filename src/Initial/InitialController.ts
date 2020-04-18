import { originalQueryController } from '../QueryLogImporting/OriginalQueryController';

export class InitialController {
  init() {
    originalQueryController.save();
  }
}

export const initialController = new InitialController();
