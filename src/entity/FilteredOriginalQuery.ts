import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from 'typeorm';
import {ParametrizedQuery} from "./ParametrizedQuery";

@Entity()
export class FilteredOriginalQuery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  queryText: string;

  @OneToOne(type => ParametrizedQuery)
  @JoinColumn({name: 'parametrized_query_id' })
  parametrizedQuery: ParametrizedQuery;
}
