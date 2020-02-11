import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column} from 'typeorm';
import {SuitableOriginalQueries} from "./SuitableOriginalQueries";

@Entity()
export class ProfileReplayInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  profileResult: string;

  @OneToOne(type => SuitableOriginalQueries)
  @JoinColumn({name: 'queryId' })
  queryId: number;
}
