import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { Response } from "express";
import type { DataSource } from "typeorm";
import { ReportsController } from "../presentation/reports.controller";
import { ReportsService } from "../application/reports.service";
import { ColumnProjectionService } from "../application/column-projection.service";
import { ExportFormatterService } from "../application/export-formatter.service";
import type { AuditRepository } from "../../audit/infrastructure/audit.repository";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import {
  ReportCompensationsQueryDto,
  ReportExportQueryDto,
  ReportGeneralQueryDto,
  ReportRoleBasedQueryDto,
} from "../presentation/dto/report-query.dto";

describe("ReportsController & ReportsService (CU-EST-002, CU-EST-003, HU-62..67)", () => {
  let controller: ReportsController;
  let reportsService: jest.Mocked<ReportsService>;
  let columnProjectionService: jest.Mocked<ColumnProjectionService>;

  const mockUserRequest = {
    user: {
      id: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
      permissions: [
        "REPORTS_VIEW",
        "REPORTS_ROLE_VIEW",
        "REPORTS_GLOBAL_VIEW",
        "REPORTS_COMPENSATIONS_VIEW",
        "REPORTS_EXPORT",
        "REPORTS_DOWNLOAD_CSV",
      ],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    reportsService = {
      getRoleBasedReport: jest.fn(),
      getGeneralReport: jest.fn(),
      getCompensationsReport: jest.fn(),
      exportReport: jest.fn(),
      getAuthorizedFilterOptions: jest.fn(),
    } as unknown as jest.Mocked<ReportsService>;

    columnProjectionService = {
      getMetadataCatalog: jest.fn(),
      resolveColumns: jest.fn(),
      projectRow: jest.fn(),
    } as unknown as jest.Mocked<ColumnProjectionService>;

    controller = new ReportsController(reportsService, columnProjectionService);
  });

  describe("GET /api/v1/reports/metadata/columns", () => {
    it("retorna las 3 categorías funcionales con columnas completas", () => {
      const mockCatalog = {
        categories: ["estructura", "puestosPersonas", "relaciones"],
        columns: [
          {
            key: "location",
            label: "Tienda / Ubicación",
            category: "estructura" as const,
            description: "Nombre del almacén",
            type: "STRING" as const,
            sensitive: false,
          },
        ],
      };

      columnProjectionService.getMetadataCatalog.mockReturnValue(mockCatalog);

      const result = controller.getMetadataColumns();

      expect(result).toEqual(mockCatalog);
      expect(result.categories).toContain("estructura");
      expect(result.categories).toContain("puestosPersonas");
      expect(result.categories).toContain("relaciones");
    });
  });

  describe("GET /api/v1/reports/role-based", () => {
    it("retorna vista previa del reporte por rol con metadatos", async () => {
      const mockResponse = {
        metadata: {
          reportType: "ROLE_BASED",
          period: "2026-10",
          isHistorical: false,
          isProjection: false,
          generatedAt: "2026-10-14T12:00:00.000Z",
          appliedColumns: ["location", "department", "sectionName"],
        },
        items: [
          {
            location: "Liverpool Insurgentes",
            department: "Belleza",
            sectionName: "Perfumería",
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      };

      reportsService.getRoleBasedReport.mockResolvedValue(mockResponse);

      const query: ReportRoleBasedQueryDto = {
        period: "2026-10",
        page: 1,
        limit: 50,
      };

      const result = await controller.getRoleBasedReport(query, mockUserRequest);

      expect(result).toEqual(mockResponse);
      expect(reportsService.getRoleBasedReport).toHaveBeenCalledWith(
        query,
        mockUserRequest.user.permissions,
        mockUserRequest.user.id,
      );
    });

    it("rechaza fechas invertidas con 400 Bad Request (FE-02)", async () => {
      reportsService.getRoleBasedReport.mockRejectedValue(
        new BadRequestException(
          "La fecha inicial no puede ser posterior a la fecha final.",
        ),
      );

      const query: ReportRoleBasedQueryDto = {
        startDate: "2026-10-31",
        endDate: "2026-10-01",
        page: 1,
        limit: 50,
      };

      await expect(
        controller.getRoleBasedReport(query, mockUserRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza con 404 si el periodo histórico no tiene fotografía (FE-05)", async () => {
      reportsService.getRoleBasedReport.mockRejectedValue(
        new NotFoundException(
          "No existe información histórica para el rango de fechas seleccionado.",
        ),
      );

      const query: ReportRoleBasedQueryDto = {
        period: "2025-01",
        page: 1,
        limit: 50,
      };

      await expect(
        controller.getRoleBasedReport(query, mockUserRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it("rechaza con 403 si la ubicación está fuera de alcance (CA-09)", async () => {
      reportsService.getRoleBasedReport.mockRejectedValue(
        new ForbiddenException(
          "Ubicación fuera de su tramo de control autorizado.",
        ),
      );

      const query: ReportRoleBasedQueryDto = {
        locationId: "99999999-9999-9999-9999-999999999999",
        page: 1,
        limit: 50,
      };

      await expect(
        controller.getRoleBasedReport(query, mockUserRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("GET /api/v1/reports/general", () => {
    it("retorna vista previa del reporte general para usuarios con REPORTS_GLOBAL_VIEW", async () => {
      const mockResponse = {
        metadata: {
          reportType: "GENERAL",
          period: "2026-10",
          isHistorical: false,
          isProjection: false,
          generatedAt: "2026-10-14T12:00:00.000Z",
          appliedColumns: ["location", "department"],
        },
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      reportsService.getGeneralReport.mockResolvedValue(mockResponse);

      const query: ReportGeneralQueryDto = {
        division: "LIVERPOOL",
        page: 1,
        limit: 50,
      };

      const result = await controller.getGeneralReport(query, mockUserRequest);

      expect(result).toEqual(mockResponse);
    });

    it("rechaza con 403 si el usuario no tiene permiso REPORTS_GLOBAL_VIEW", async () => {
      reportsService.getGeneralReport.mockRejectedValue(
        new ForbiddenException(
          "No cuentas con permiso para generar el Reporte General.",
        ),
      );

      const restrictedRequest = {
        user: {
          id: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
          permissions: ["REPORTS_VIEW"],
        },
      } as unknown as AuthenticatedRequest;

      const query: ReportGeneralQueryDto = { page: 1, limit: 50 };

      await expect(
        controller.getGeneralReport(query, restrictedRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("GET /api/v1/reports/compensations", () => {
    it("retorna consolidado mensual de compensaciones", async () => {
      const mockResponse = {
        metadata: {
          reportType: "COMPENSATIONS_JEFES_CON_SECCION",
          period: "2026-10",
          isHistorical: false,
          isProjection: false,
          generatedAt: "2026-10-14T12:00:00.000Z",
          appliedColumns: ["location", "department", "employeeName"],
        },
        items: [],
        total: 0,
        page: 1,
        limit: 50,
      };

      reportsService.getCompensationsReport.mockResolvedValue(mockResponse);

      const query: ReportCompensationsQueryDto = {
        period: "2026-10",
        variant: "JEFES_CON_SECCION",
        page: 1,
        limit: 50,
      };

      const result = await controller.getCompensationsReport(
        query,
        mockUserRequest,
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe("GET /api/v1/reports/export/csv and /export/txt", () => {
    it("descarga archivo CSV con headers correctos", async () => {
      const mockExport = {
        filename: "zdeptos_reporte_role_based_2026-10.csv",
        content: '"location","department"\r\n"Liverpool","Belleza"',
        contentType: "text/csv; charset=utf-8",
      };

      reportsService.exportReport.mockResolvedValue(mockExport);

      const mockSetHeader = jest.fn();
      const mockSend = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ send: mockSend });
      const mockRes = {
        setHeader: mockSetHeader,
        status: mockStatus,
      } as unknown as Response;

      const query: ReportExportQueryDto = {
        reportType: "ROLE_BASED",
        period: "2026-10",
        page: 1,
        limit: 50,
      };

      await controller.exportCsv(query, mockUserRequest, mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv; charset=utf-8",
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="zdeptos_reporte_role_based_2026-10.csv"',
      );
      expect(mockSend).toHaveBeenCalledWith(mockExport.content);
    });

    it("descarga archivo TXT pipe-delimited con headers correctos", async () => {
      const mockExport = {
        filename: "zdeptos_reporte_role_based_2026-10.txt",
        content: "location|department\r\nLiverpool|Belleza",
        contentType: "text/plain; charset=utf-8",
      };

      reportsService.exportReport.mockResolvedValue(mockExport);

      const mockSetHeader = jest.fn();
      const mockSend = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ send: mockSend });
      const mockRes = {
        setHeader: mockSetHeader,
        status: mockStatus,
      } as unknown as Response;

      const query: ReportExportQueryDto = {
        reportType: "ROLE_BASED",
        period: "2026-10",
        page: 1,
        limit: 50,
      };

      await controller.exportTxt(query, mockUserRequest, mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain; charset=utf-8",
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="zdeptos_reporte_role_based_2026-10.txt"',
      );
      expect(mockSend).toHaveBeenCalledWith(mockExport.content);
    });

    it("bloquea descarga con 403 si el usuario carece de permiso de descarga (CA-08)", async () => {
      reportsService.exportReport.mockRejectedValue(
        new ForbiddenException(
          "Puedes visualizar el reporte, pero no tienes permiso para descargarlo.",
        ),
      );

      const mockRes = {} as unknown as Response;
      const query: ReportExportQueryDto = {
        reportType: "ROLE_BASED",
        page: 1,
        limit: 50,
      };

      await expect(
        controller.exportCsv(query, mockUserRequest, mockRes),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Verificación 100% CU-EST-002 en ColumnProjectionService y ReportsService", () => {
    const realProjection = new ColumnProjectionService();
    const realFormatter = new ExportFormatterService();

    it("CA-02: selectAll=true selecciona todos los campos autorizados y excluye campos sensibles (employeeId) si no tiene permiso", () => {
      const colsWithoutSensitive = realProjection.resolveColumns(
        undefined,
        true,
        ["REPORTS_VIEW"],
      );
      expect(colsWithoutSensitive).not.toContain("employeeId");
      expect(colsWithoutSensitive).toContain("location");
      expect(colsWithoutSensitive).toContain("centerCode");
      expect(colsWithoutSensitive).toContain("jobFunction");

      const colsWithSensitive = realProjection.resolveColumns(
        undefined,
        true,
        ["REPORTS_VIEW", "REPORTS_SENSITIVE_VIEW"],
      );
      expect(colsWithSensitive).toContain("employeeId");
    });

    it("CA-03: selección parcial incluye los campos seleccionados más el campo técnico obligatorio (effectiveDate)", () => {
      const cols = realProjection.resolveColumns(
        "location,department",
        false,
        ["REPORTS_VIEW"],
      );
      expect(cols).toEqual(["effectiveDate", "location", "department"]);
    });

    it("CA-10: bloquea generación con 400 cuando requireColumnSelection=true y no se selecciona ningún dato", () => {
      expect(() =>
        realProjection.resolveColumns(undefined, false, ["REPORTS_VIEW"], true),
      ).toThrow(BadRequestException);

      expect(() =>
        realProjection.resolveColumns("   ", false, ["REPORTS_VIEW"], false),
      ).toThrow(BadRequestException);
    });

    it("FA-01, FA-05, FE-03, FE-04 y FE-06 en ReportsService", async () => {
      const mockAuditAppend = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const mockAuditRepo = {
        append: mockAuditAppend,
      } as unknown as AuditRepository;

      const singleLocId = "11111111-1111-1111-1111-111111111111";
      const mockQuery = jest.fn<(...args: unknown[]) => Promise<unknown>>();
      const mockDataSource = {
        manager: {},
        query: mockQuery,
      } as unknown as DataSource;

      const service = new ReportsService(
        mockDataSource,
        realProjection,
        realFormatter,
        mockAuditRepo,
      );

      // Escenario FA-01 (autoselección de única ubicación) + FE-03 (sin datos -> mensaje exacto)
      mockQuery
        .mockResolvedValueOnce([{ has_table: false }]) // verifyEmployeeCentralSync
        .mockResolvedValueOnce([{ scope_type: "STORE", structure_node_id: singleLocId }]) // user_role_assignment scopes
        .mockResolvedValueOnce([]) // user_permission_exception
        .mockResolvedValueOnce([{ id: "p-1", year: 2026, month: 10, status: "ACTIVE" }]) // operational_period
        .mockResolvedValueOnce([]); // active structure data vacía

      const emptyRes = await service.getRoleBasedReport(
        { page: 1, limit: 50 },
        ["REPORTS_VIEW"],
        singleLocId,
      );

      expect(emptyRes.metadata.effectiveScope?.autoSelectedSingleLocation).toBe(true);
      expect(emptyRes.metadata.effectiveScope?.appliedLocationId).toBe(singleLocId);
      expect(emptyRes.message).toBe(
        "No se encontraron datos para los filtros seleccionados.",
      );

      // Escenario FE-06: Fallo de sincronización con Employee Central
      mockQuery
        .mockResolvedValueOnce([{ has_table: true }])
        .mockResolvedValueOnce([{ status: "CRITICAL_FAILURE" }]);

      await expect(
        service.getRoleBasedReport(
          { page: 1, limit: 50 },
          ["REPORTS_VIEW"],
          singleLocId,
        ),
      ).rejects.toThrow(ServiceUnavailableException);

      // Escenario FE-04: Error durante construcción del archivo registra incidente y lanza InternalServerErrorException
      const brokenFormatter = {
        toCsv: () => {
          throw new Error("Disk write error");
        },
      } as unknown as ExportFormatterService;

      const serviceWithBrokenExport = new ReportsService(
        mockDataSource,
        realProjection,
        brokenFormatter,
        mockAuditRepo,
      );

      mockQuery
        .mockResolvedValueOnce([{ has_table: false }])
        .mockResolvedValueOnce([{ scope_type: "GLOBAL", structure_node_id: "" }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "p-1", year: 2026, month: 10, status: "ACTIVE" }])
        .mockResolvedValueOnce([]);

      await expect(
        serviceWithBrokenExport.exportReport(
          { reportType: "ROLE_BASED", page: 1, limit: 50 },
          "CSV",
          ["REPORTS_VIEW", "REPORTS_EXPORT"],
          singleLocId,
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
