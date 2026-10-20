import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ schema: "zd_plan", name: "operational_period" })
export class OperationalPeriodEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "smallint" })
  year!: number;

  @Column({ type: "smallint" })
  month!: number;

  @Column({ name: "start_date", type: "date" })
  startDate!: string;

  @Column({ name: "end_date", type: "date" })
  endDate!: string;

  @Column({ name: "editing_start", type: "timestamptz", nullable: true })
  editingStart!: Date | null;

  @Column({ name: "editing_end", type: "timestamptz", nullable: true })
  editingEnd!: Date | null;

  @Column({
    type: "varchar",
    length: 30,
    default: "OPEN",
  })
  status!: "OPEN" | "CLOSED" | "IN_CALCULATION" | "PUBLISHED" | "HISTORICAL";
}
