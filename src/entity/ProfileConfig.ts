import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class ProfileConfig {
  @PrimaryGeneratedColumn()
  statusId: number;

  @Column('varchar', {length: 25})
  statusName: string;

  @Column('boolean')
  isUser: boolean;

  @Column('integer')
  statusConfigValue: number
}
