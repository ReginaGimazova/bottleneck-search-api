import {Entity, PrimaryGeneratedColumn, OneToOne, JoinColumn, Column} from 'typeorm';
import {FilteredOriginalQuery} from "./FilteredOriginalQuery";

@Entity()
export class ProfileReplayInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  profileResult: string;

  @OneToOne(type => FilteredOriginalQuery)
  @JoinColumn({name: 'queryId' })
  queryId: number;
}
