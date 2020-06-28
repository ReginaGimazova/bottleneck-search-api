import { Request, Response } from 'express';
import StatusesConfigurationDataStore from "./StatusesConfigurationDataStore";
import {checkTableInDatabase} from "../Initial/CheckTableInDatabase";

export class StatusesConfigurationController {
  public async getAll(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();

    const existCheckResult = await checkTableInDatabase.checkTable('statuses_configuration');

    if (!existCheckResult) {
      res.status(200).send([]);
      return;
    }

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

  public update(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();
    const statuses = req.body.statuses;

    configurationDataStore.update(statuses, (isUpdateSuccess, err) => {
      if (err){
        res.status(500).send({
          message:
            err.message || 'Update status error'
        });
      }
      else if (isUpdateSuccess) {
        res.sendStatus(200);
      }
    })
  }

  public addStatus(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();
    const {value, mode, type} = req.body;

    configurationDataStore.addStatus({value, mode, type}, async (data, err) => {
      if (err){
        res.status(500).send({
          message: err.message || 'Add status error'
        })
      } else {
        await this.getAll(req, res);
      }
    })
  }

  public removeStatus(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();
    const {value, type} = req.body;

    configurationDataStore.removeStatus({value, type}, async (data, err) => {
      if (err){
        res.status(500).send({
          message: err.message || 'Remove status error'
        })
      } else {
        await this.getAll(req, res);
      }
    })
  }
}

export const configurationController = new StatusesConfigurationController();
