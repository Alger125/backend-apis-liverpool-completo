import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { StructuresService } from "./application/structures.service";
import { StructuresController } from "./presentation/structures.controller";

@Module({
  imports: [AuditModule],
  controllers: [StructuresController],
  providers: [StructuresService],
  exports: [StructuresService],
})
export class StructuresModule {}
