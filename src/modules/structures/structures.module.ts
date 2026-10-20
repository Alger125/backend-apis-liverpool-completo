import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditModule } from "../audit/audit.module";
import {
  CommercialGroupEntity,
  DepartmentStructureStateEntity,
  GroupSectionAssignmentEntity,
  LevelTypeEntity,
  OperationalPeriodEntity,
  SectionReferenceEntity,
  StructureNodeEntity,
  StructureNodeRelationEntity,
} from "./domain/entities";
import { StructuresService } from "./application/structures.service";
import { StructuresController } from "./presentation/structures.controller";

@Module({
  imports: [
    AuditModule,
    TypeOrmModule.forFeature([
      StructureNodeEntity,
      LevelTypeEntity,
      StructureNodeRelationEntity,
      CommercialGroupEntity,
      SectionReferenceEntity,
      GroupSectionAssignmentEntity,
      DepartmentStructureStateEntity,
      OperationalPeriodEntity,
    ]),
  ],
  controllers: [StructuresController],
  providers: [StructuresService],
  exports: [StructuresService],
})
export class StructuresModule {}

