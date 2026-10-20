import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ColumnProjectionService } from "./application/column-projection.service";
import { ExportFormatterService } from "./application/export-formatter.service";
import { ReportsService } from "./application/reports.service";
import { ReportsController } from "./presentation/reports.controller";

@Module({
  imports: [AuditModule],
  controllers: [ReportsController],
  providers: [
    ColumnProjectionService,
    ExportFormatterService,
    ReportsService,
  ],
  exports: [ReportsService, ColumnProjectionService, ExportFormatterService],
})
export class ReportsModule {}
