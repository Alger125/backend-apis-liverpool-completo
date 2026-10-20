import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ schema: "zd_ref", name: "section_reference" })
export class SectionReferenceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "external_code", type: "varchar", length: 100 })
  code!: string;

  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "varchar", length: 20, default: "ACTIVE" })
  status!: string;
}
