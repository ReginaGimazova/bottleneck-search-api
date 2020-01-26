import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TablesStatistic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 25 })
  tableName: string;

  @Column()
  callCount: number;
}
