import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class ParametrizedQuery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  parsedQueryText: string;

  @Column('varchar', { length: 40 })
  userHost: string;
}
