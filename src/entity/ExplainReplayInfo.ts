import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column} from 'typeorm';
import {FilteredOriginalQuery} from "./FilteredOriginalQuery";

@Entity()
export class ExplainReplayInfo {
  @PrimaryGeneratedColumn()
  id: number;

  /*@ManyToOne(type => FilteredOriginalQuery, (originalQuery: FilteredOriginalQuery) => originalQuery.id)
  queryId: number;*/

  @Column('text')
  explainResult: string;

  @OneToOne(type => FilteredOriginalQuery)
  @JoinColumn({name: 'queryId' })
  queryId: number;
}
