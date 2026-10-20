import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { CommercialGroupEntity } from "./commercial-group.entity";
import { SectionReferenceEntity } from "./section-reference.entity";

@Entity({ schema: "zd_core", name: "group_section_assignment" })
export class GroupSectionAssignmentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "business_structure_id", type: "uuid" })
  businessStructureId!: string;

  @Column({ name: "department_node_id", type: "uuid" })
  departmentNodeId!: string;

  @Column({ name: "commercial_group_id", type: "uuid" })
  commercialGroupId!: string;

  @ManyToOne(() => CommercialGroupEntity, (group) => group.sectionAssignments)
  @JoinColumn({ name: "commercial_group_id" })
  commercialGroup!: CommercialGroupEntity;

  @Column({ name: "section_id", type: "uuid" })
  sectionId!: string;

  @ManyToOne(() => SectionReferenceEntity, { eager: true })
  @JoinColumn({ name: "section_id" })
  section!: SectionReferenceEntity;

  @Column({
    name: "assignment_origin",
    type: "varchar",
    length: 30,
    default: "MANUAL",
  })
  assignmentOrigin!: "MANUAL" | "ANCHOR" | "INITIAL_LOAD" | "SCHEDULED";

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
}
