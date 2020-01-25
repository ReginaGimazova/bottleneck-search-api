import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class ParsedRequest{
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  parsedRequestText: string;

  @Column("varchar", {length: 40})
  userHost: string
}