import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { Response } from "express";
import { BatchImportController } from "../presentation/batch-import.controller";
import { BatchImportService } from "../application/batch-import.service";
import type { AuthenticatedRequest } from "../../../shared/http/authenticated-request";
import { BatchImportDto } from "../presentation/dto/batch-import.dto";

describe("BatchImportController (Feature 03 - CU-CIN-001)", () => {
  let controller: BatchImportController;
  let service: jest.Mocked<BatchImportService>;

  const mockRequest = {
    user: {
      id: "44fc25bd-d556-56da-926e-27dc3ea0eacc",
      permissions: ["BATCH_IMPORT_EXECUTE"],
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(() => {
    service = {
      getLayoutSpecification: jest.fn(),
      processBatchImport: jest.fn(),
    } as unknown as jest.Mocked<BatchImportService>;

    controller = new BatchImportController(service);
  });

  describe("GET /api/v1/admin/batch-import/layout", () => {
    it("retorna la especificación en JSON cuando format=JSON", () => {
      const mockSpec = {
        layoutVersion: "V2.1-LIVERPOOL",
        allowedExtensions: [".csv", ".txt"],
        delimiter: ",",
        columns: [],
      };

      service.getLayoutSpecification.mockReturnValue(mockSpec);

      const mockJson = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      const mockRes = { status: mockStatus } as unknown as Response;

      controller.getLayout("JSON", mockRes);

      expect(service.getLayoutSpecification).toHaveBeenCalledWith("JSON");
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockSpec);
    });

    it("descarga la plantilla CSV cuando format=CSV", () => {
      const mockSpec = {
        layoutVersion: "V2.1-LIVERPOOL",
        allowedExtensions: [".csv", ".txt"],
        delimiter: ",",
        columns: [],
        templateCsv: "locationCode,parentDepartmentCode,groupName,groupCode,sectionCode,assignmentOrigin,effectivePeriod\n",
      };

      service.getLayoutSpecification.mockReturnValue(mockSpec);

      const mockSetHeader = jest.fn();
      const mockSend = jest.fn();
      const mockStatus = jest.fn().mockReturnValue({ send: mockSend });
      const mockRes = {
        setHeader: mockSetHeader,
        status: mockStatus,
      } as unknown as Response;

      controller.getLayout("CSV", mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv; charset=utf-8",
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="plantilla_carga_masiva_zdeptos.csv"',
      );
      expect(mockSend).toHaveBeenCalledWith(mockSpec.templateCsv);
    });
  });

  describe("POST /api/v1/admin/batch-import", () => {
    const validDto: BatchImportDto = {
      fileName: "carga_inicial_2026_10.csv",
      dryRun: true,
      period: "2026-10",
      rows: [
        {
          locationCode: "LOC-001",
          parentDepartmentCode: "DEP-001",
          groupName: "Grupo Belleza 1",
          groupCode: "01",
          sectionCode: "SEC-001",
          assignmentOrigin: "INITIAL_LOAD",
        },
      ],
    };

    it("procesa validación en modo dryRun correctamente", async () => {
      const mockResult = {
        success: true,
        dryRun: true,
        period: "2026-10",
        validRowsCount: 1,
        invalidRowsCount: 0,
        processedGroupsCount: 0,
        processedAssignmentsCount: 0,
        errors: [],
        summary: "Validación de layout completada sin errores. Listo para aplicar.",
      };

      service.processBatchImport.mockResolvedValue(mockResult);

      const result = await controller.executeBatchImport(validDto, mockRequest);

      expect(result).toEqual(mockResult);
      expect(service.processBatchImport).toHaveBeenCalledWith(
        validDto,
        mockRequest.user.id,
      );
    });

    it("rechaza archivo si el formato no es .csv o .txt", async () => {
      service.processBatchImport.mockRejectedValue(
        new BadRequestException(
          "El formato del archivo no es admitido. Solo se permiten extensiones .csv y .txt (CA-CIN-004).",
        ),
      );

      const invalidDto: BatchImportDto = {
        ...validDto,
        fileName: "carga_invalida.xlsx",
      };

      await expect(
        controller.executeBatchImport(invalidDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it("rechaza carga si el periodo es histórico o cerrado", async () => {
      service.processBatchImport.mockRejectedValue(
        new ForbiddenException(
          "El periodo operativo 2026-09 no permite modificaciones masivas porque se encuentra en estado HISTORICAL (CU-ADM-007).",
        ),
      );

      const historicalDto: BatchImportDto = {
        ...validDto,
        period: "2026-09",
      };

      await expect(
        controller.executeBatchImport(historicalDto, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
