import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

import {getSelectQuery} from '../parses';

@Entity()
export class LogString{
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  selectQuery: string;

  queryString: string;

  public getSelectQuery(){
    this.selectQuery = getSelectQuery(this.queryString);
    return this.selectQuery;
  }
}