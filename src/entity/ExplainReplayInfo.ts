import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column} from 'typeorm';
import {SuitableOriginalQueries} from "./SuitableOriginalQueries";

@Entity()
export class ExplainReplayInfo {
  @PrimaryGeneratedColumn()
  id: number;

  /*@ManyToOne(type => SuitableOriginalQueries, (originalQuery: SuitableOriginalQueries) => originalQuery.id)
  queryId: number;*/

  @Column('text')
  explainResult: string;

  @OneToOne(type => SuitableOriginalQueries)
  @JoinColumn({name: 'queryId' })
  queryId: number;
}
