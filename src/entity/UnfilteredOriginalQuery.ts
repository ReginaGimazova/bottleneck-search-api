import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class UnfilteredOriginalQuery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  queryText: string
}
