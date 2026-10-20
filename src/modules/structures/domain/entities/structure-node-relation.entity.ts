import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StructureNodeEntity } from "./structure-node.entity";

@Entity({ schema: "zd_core", name: "structure_node_relation" })
export class StructureNodeRelationEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "business_structure_id", type: "uuid" })
  businessStructureId!: string;

  @Column({ name: "parent_node_id", type: "uuid", nullable: true })
  parentNodeId!: string | null;

  @ManyToOne(() => StructureNodeEntity)
  @JoinColumn({ name: "parent_node_id" })
  parentNode!: StructureNodeEntity | null;

  @Column({ name: "child_node_id", type: "uuid" })
  childNodeId!: string;

  @ManyToOne(() => StructureNodeEntity)
  @JoinColumn({ name: "child_node_id" })
  childNode!: StructureNodeEntity;

  @Column({ name: "effective_start", type: "date" })
  effectiveStart!: string;

  @Column({ name: "effective_end", type: "date", nullable: true })
  effectiveEnd!: string | null;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: string;

  @Column({ type: "bigint", default: 0 })
  version!: string;
}
