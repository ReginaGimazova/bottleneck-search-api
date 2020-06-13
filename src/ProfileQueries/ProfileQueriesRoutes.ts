import * as express from 'express';
import { profileQueriesController } from './ProfileQueriesController';
import {Request, Response} from "express";

class ProfileQueriesRoutes {
  public router: express.Router = express.Router();

  constructor() {
    this.config();
  }

  private config(): void {
    this.router.get('/', async (req: express.Request, res: express.Response) => {
      await profileQueriesController.getAll(req, res)
    });
    this.router.post('/update', async (req: Request, res: Response ) => {
      await profileQueriesController.update(req, res);
    })
  }
}

export const profileQueriesRoutes = new ProfileQueriesRoutes().router;
