import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { LevelTypeEntity } from "./level-type.entity";
import { CommercialGroupEntity } from "./commercial-group.entity";

@Entity({ schema: "zd_core", name: "structure_node" })
export class StructureNodeEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "business_structure_id", type: "uuid" })
  businessStructureId!: string;

  @Column({ name: "level_type_id", type: "uuid" })
  levelTypeId!: string;

  @ManyToOne(() => LevelTypeEntity, { eager: true })
  @JoinColumn({ name: "level_type_id" })
  levelType!: LevelTypeEntity;

  @Column({ name: "external_code", type: "varchar", length: 100, nullable: true })
  externalCode!: string | null;

  @Column({ name: "display_name", type: "varchar", length: 255 })
  displayName!: string;

  @Column({ name: "effective_start", type: "date" })
  effectiveStart!: string;

  @Column({ name: "effective_end", type: "date", nullable: true })
  effectiveEnd!: string | null;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: string;

  @OneToMany(() => CommercialGroupEntity, (group) => group.departmentNode)
  groups!: CommercialGroupEntity[];
}
