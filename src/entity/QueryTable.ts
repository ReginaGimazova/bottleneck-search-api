import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column} from 'typeorm';
import {FilteredOriginalQuery} from "./FilteredOriginalQuery";
import {TablesStatistic} from "./TablesStatistic ";

@Entity()
export class QueryTable {

  @OneToOne(type => FilteredOriginalQuery, {primary: true})
  @JoinColumn({name: 'queryId' })
  queryId: number;

  @OneToOne(type => TablesStatistic, {primary: true})
  @JoinColumn({name: 'tableId'})
  tableId: number
}
