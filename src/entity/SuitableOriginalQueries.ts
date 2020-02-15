import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from 'typeorm';
import {ParametrizedQuery} from "./ParametrizedQuery";

@Entity()
export class SuitableOriginalQueries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', {length: 40})
  userHost: string;

  @Column('text')
  queryText: string;

  @OneToOne(type => ParametrizedQuery)
  @JoinColumn({name: 'parametrized_query_id' })
  parametrizedQuery: ParametrizedQuery;
}
