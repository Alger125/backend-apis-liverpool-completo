import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AuditController } from "../presentation/audit.controller";
import { AuditService } from "../application/audit.service";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { AuditLogsQueryDto } from "../presentation/dto/audit-logs-query.dto";

describe("AuditController (Feature 03 - CU-HIS-001)", () => {
  let controller: AuditController;
  let service: jest.Mocked<AuditService>;

  const mockRequest = {
    user: {
      id: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
      permissions: ["AUDIT_VIEW"],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    service = {
      findLogs: jest.fn(),
      findLogById: jest.fn(),
    } as unknown as jest.Mocked<AuditService>;

    controller = new AuditController(service);
  });

  describe("GET /api/v1/audit/logs", () => {
    it("retorna lista paginada de movimientos correctamente", async () => {
      const mockResult = {
        items: [
          {
            id: "11111111-1111-1111-1111-111111111111",
            modifiedAt: "2026-10-14T12:00:00.000Z",
            actorFullName: "Edgar Administrador",
            actorUserId: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
            actorUsername: "edgar@liverpool.com.mx",
            actorRole: "Administrador de Seguridad",
            action: "SECTION_MOVED",
            entityType: "SECTION",
            entityDisplayName: "Sección Perfumería",
            effectiveDate: "2026-10-14",
            result: "SUCCESS",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      service.findLogs.mockResolvedValue(mockResult);

      const query: AuditLogsQueryDto = {
        page: 1,
        limit: 20,
      };

      const result = await controller.getAuditLogs(query, mockRequest);

      expect(result).toEqual(mockResult);
      expect(service.findLogs).toHaveBeenCalledWith(query, mockRequest.user.id);
    });

    it("retorna mensaje informativo si no hay registros", async () => {
      const emptyResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        message: "No se encontraron movimientos para los filtros seleccionados.",
      };

      service.findLogs.mockResolvedValue(emptyResult);

      const query: AuditLogsQueryDto = {
        page: 1,
        limit: 20,
        action: "NON_EXISTENT_ACTION",
      };

      const result = await controller.getAuditLogs(query, mockRequest);

      expect(result.items).toHaveLength(0);
      expect(result.message).toBe(
        "No se encontraron movimientos para los filtros seleccionados.",
      );
    });

    it("rechaza fechas invertidas si startDate > endDate", async () => {
      service.findLogs.mockRejectedValue(
        new BadRequestException(
          "La fecha inicial no puede ser posterior a la fecha final.",
        ),
      );

      const query: AuditLogsQueryDto = {
        startDate: "2026-10-20",
        endDate: "2026-10-10",
        page: 1,
        limit: 20,
      };

      await expect(controller.getAuditLogs(query, mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("GET /api/v1/audit/logs/:eventId", () => {
    it("retorna el detalle completo de un movimiento", async () => {
      const mockDetail = {
        id: "11111111-1111-1111-1111-111111111111",
        modifiedAt: "2026-10-14T12:00:00.000Z",
        actorFullName: "Edgar Administrador",
        actorUserId: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
        actorUsername: "edgar@liverpool.com.mx",
        actorRole: "Administrador de Seguridad",
        action: "SECTION_MOVED",
        entityType: "SECTION",
        entityDisplayName: "Sección Perfumería",
        effectiveDate: "2026-10-14",
        result: "SUCCESS",
        previousValue: { groupId: "group-1" },
        newValue: { groupId: "group-2" },
        reason: "Reorganización comercial mensual",
        source: "ZDeptos Web UI",
        correlationId: "corr-12345",
      };

      service.findLogById.mockResolvedValue(mockDetail);

      const result = await controller.getAuditLogById(mockDetail.id, mockRequest);

      expect(result).toEqual(mockDetail);
      expect(service.findLogById).toHaveBeenCalledWith(
        mockDetail.id,
        mockRequest.user.id,
      );
    });

    it("retorna 404 si el evento no existe", async () => {
      service.findLogById.mockRejectedValue(
        new NotFoundException("Movimiento de auditoría no encontrado."),
      );

      await expect(
        controller.getAuditLogById(
          "99999999-9999-9999-9999-999999999999",
          mockRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
