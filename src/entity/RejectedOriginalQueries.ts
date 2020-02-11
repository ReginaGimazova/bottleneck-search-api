import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class RejectedOriginalQueries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  queryText: string
}
