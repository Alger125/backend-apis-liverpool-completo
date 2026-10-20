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
import { StructuresComprasPacService } from "./application/structures-compras-pac.service";
import { StructuresPlanningService } from "./application/structures-planning.service";
import { StructuresController } from "./presentation/structures.controller";
import { StructuresComprasPacController } from "./presentation/structures-compras-pac.controller";
import { StructuresPlanningController } from "./presentation/structures-planning.controller";

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
  controllers: [
    StructuresController,
    StructuresComprasPacController,
    StructuresPlanningController,
  ],
  providers: [
    StructuresService,
    StructuresComprasPacService,
    StructuresPlanningService,
  ],
  exports: [
    StructuresService,
    StructuresComprasPacService,
    StructuresPlanningService,
  ],
})
export class StructuresModule {}

