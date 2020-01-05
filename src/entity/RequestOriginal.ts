import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class RequestOriginal{
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  requestText: string;
}