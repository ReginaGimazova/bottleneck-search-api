import { Request, Response } from 'express';
import StatusesConfigurationDataStore from "./StatusesConfigurationDataStore";
import {checkTableInDatabase} from "../helpers/CheckTableInDatabase";

export class StatusesConfigurationController {
  public getAll(req: Request, res: Response) {
    const configurationDataStore = new StatusesConfigurationDataStore();

    checkTableInDatabase.checkTable({
      tableName: 'statuses_configuration',
      callbackCheckTable: existCheckResult => {
        if (!existCheckResult) {
          res.status(200).send([]);
          return;
        }

      },
    });

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

    configurationDataStore.update(statuses, (data, err) => {
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
