import {Request, Response} from "express";

export class OriginalRequest {

  public routes(app): void {
    app.route('/original-request')
      .get((req: Request, res: Response) => {
        res.status(200).send('ok');
      })
  }
}