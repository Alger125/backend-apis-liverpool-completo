import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity({ schema: "zd_core", name: "department_structure_state" })
export class DepartmentStructureStateEntity {
  @PrimaryColumn({ name: "department_node_id", type: "uuid" })
  departmentNodeId!: string;

  @PrimaryColumn({ name: "operational_period_id", type: "uuid" })
  operationalPeriodId!: string;

  @Column({ type: "bigint", default: 0 })
  version!: string;

  @Column({ name: "last_modified_by", type: "uuid", nullable: true })
  lastModifiedBy!: string | null;

  @UpdateDateColumn({ name: "last_modified_at", type: "timestamptz" })
  lastModifiedAt!: Date;
}
