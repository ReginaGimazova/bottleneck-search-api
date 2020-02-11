import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column} from 'typeorm';
import {SuitableOriginalQueries} from "./SuitableOriginalQueries";
import {TablesStatistic} from "./TablesStatistic ";

@Entity()
export class QueryTable {

  @OneToOne(type => SuitableOriginalQueries, {primary: true})
  @JoinColumn({name: 'queryId' })
  queryId: number;

  @OneToOne(type => TablesStatistic, {primary: true})
  @JoinColumn({name: 'tableId'})
  tableId: number
}
