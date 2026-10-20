import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthService } from "./application/auth.service";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
