import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { BatchImportController } from "./presentation/batch-import.controller";
import { BatchImportService } from "./application/batch-import.service";

@Module({
  imports: [AuditModule],
  controllers: [BatchImportController],
  providers: [BatchImportService],
  exports: [BatchImportService],
})
export class BatchImportModule {}
