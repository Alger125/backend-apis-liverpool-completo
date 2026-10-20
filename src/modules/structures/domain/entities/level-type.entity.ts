import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ schema: "zd_config", name: "level_type" })
export class LevelTypeEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  code!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ name: "owner_type", type: "varchar", length: 20 })
  ownerType!: string;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: string;
}
