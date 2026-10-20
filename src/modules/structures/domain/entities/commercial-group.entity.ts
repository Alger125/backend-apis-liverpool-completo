import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StructureNodeEntity } from "./structure-node.entity";
import { GroupSectionAssignmentEntity } from "./group-section-assignment.entity";

@Entity({ schema: "zd_core", name: "commercial_group" })
export class CommercialGroupEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "business_structure_id", type: "uuid" })
  businessStructureId!: string;

  @Column({ name: "department_node_id", type: "uuid" })
  departmentNodeId!: string;

  @ManyToOne(() => StructureNodeEntity, (node) => node.groups)
  @JoinColumn({ name: "department_node_id" })
  departmentNode!: StructureNodeEntity;

  @Column({ name: "sequence_number", type: "integer" })
  sequenceNumber!: number;

  @Column({ name: "display_code", type: "varchar", length: 50 })
  displayCode!: string;

  @Column({ type: "varchar", length: 200 })
  name!: string;

  @Column({ name: "effective_start", type: "date" })
  effectiveStart!: string;

  @Column({ name: "effective_end", type: "date", nullable: true })
  effectiveEnd!: string | null;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: string;

  @Column({ type: "bigint", default: 0 })
  version!: string;

  @Column({ name: "created_by", type: "uuid", nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => GroupSectionAssignmentEntity, (assignment) => assignment.commercialGroup)
  sectionAssignments!: GroupSectionAssignmentEntity[];
}
