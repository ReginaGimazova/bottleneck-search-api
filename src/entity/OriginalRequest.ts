import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class OriginalRequest{
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  requestText: string;
}