import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditEventEntity } from "./infrastructure/audit-event.entity";
import { AuditRepository } from "./infrastructure/audit.repository";

@Module({
  imports: [TypeOrmModule.forFeature([AuditEventEntity])],
  providers: [AuditRepository],
  exports: [AuditRepository],
})
export class AuditModule {}
