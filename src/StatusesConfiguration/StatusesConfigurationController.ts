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

  public save(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();
    const statusIds = req.body.status_ids;

    configurationDataStore.save(statusIds, (data, err) => {
      if (err){
        res.status(404).send({
          message:
            err.message || 'Error'
        });
      }
      else {
        this.getAll(req, res)
      }
    })
  }

  public addStatus(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();
    const {value, status, type} = req.body;

    configurationDataStore.addStatus({value, status, type}, (data, err) => {
      if (err){
        res.status(404).send({
          message: err.message || 'Error'
        })
      } else {
        this.getAll(req, res);
      }
    })
  }
}

export const configurationController = new StatusesConfigurationController();
