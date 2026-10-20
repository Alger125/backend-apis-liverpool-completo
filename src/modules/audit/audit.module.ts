import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditEventEntity } from "./infrastructure/audit-event.entity";
import { AuditRepository } from "./infrastructure/audit.repository";
import { AuditService } from "./application/audit.service";
import { AuditController } from "./presentation/audit.controller";

@Module({
  imports: [TypeOrmModule.forFeature([AuditEventEntity])],
  controllers: [AuditController],
  providers: [AuditRepository, AuditService],
  exports: [AuditRepository, AuditService],
})
export class AuditModule {}
