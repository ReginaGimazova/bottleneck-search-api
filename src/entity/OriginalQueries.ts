import {Entity, PrimaryGeneratedColumn, Column} from 'typeorm';

@Entity()
export class OriginalQueries {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', {length: 20})
  eventTime: string;

  @Column('varchar', {length: 30})
  userHost: string;

  @Column('integer')
  threadId: number;

  @Column('integer')
  serverId: number;

  @Column('varchar', {length: 10})
  commandType: string;

  @Column('text')
  argument: string;
}
