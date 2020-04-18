import { Request, Response } from 'express';
import StatusesConfigurationDataStore from "./StatusesConfigurationDataStore";

export class StatusesConfigurationController {
  public getAll(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();

    configurationDataStore.getAll((data, err) => {
      if (err)
        res.status(404).send({
          message:
            err.message ||
            'Server error occurred while retrieving configuration.',
        });
      else res.status(200).send(data);
    });
  }
}

export const configurationController = new StatusesConfigurationController();
