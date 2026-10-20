import { Test, TestingModule } from "@nestjs/testing";
import { StructuresController } from "../presentation/structures.controller";
import { StructuresService } from "../application/structures.service";
import { ApiKeyGuard, PermissionsGuard } from "../../../shared/security/security";

describe("StructuresController (Compras, PAC, Suburbia 70051507 & EC Sync)", () => {
  let controller: StructuresController;
  let service: StructuresService;

  const mockStructuresService = {
    getBaseDepartmentsConfig: jest.fn(),
    updateBaseDepartmentsConfig: jest.fn(),
    getComprasPacTree: jest.fn(),
    getSuburbiaAdvisors: jest.fn(),
    getCollaboratorManagedSections: jest.fn(),
    processEcInboundEvent: jest.fn(),
    syncManagedSectionsToEc: jest.fn(),
    getEcOutbox: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StructuresController],
      providers: [
        {
          provide: StructuresService,
          useValue: mockStructuresService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StructuresController>(StructuresController);
    service = module.get<StructuresService>(StructuresService);
    jest.clearAllMocks();
  });

  it("should get and update base departments config (HU-022 / DEC-15)", async () => {
    mockStructuresService.getBaseDepartmentsConfig.mockResolvedValue({
      decisionRef: "DEC-15",
      totalCount: 2,
      baseDepartments: [],
    });
    const getRes = await controller.getBaseDepartmentsConfig("COMPRAS");
    expect(service.getBaseDepartmentsConfig).toHaveBeenCalledWith("COMPRAS");
    expect(getRes.decisionRef).toBe("DEC-15");

    const dto = {
      baseDepartments: [
        {
          departmentCode: "DEPT-COMPRAS-HL",
          displayName: "Compras Hardline",
          structureType: "COMPRAS" as const,
          division: "HARDLINE",
          isActive: true,
        },
      ],
    };
    mockStructuresService.updateBaseDepartmentsConfig.mockResolvedValue({
      decisionRef: "DEC-15",
      totalCount: 1,
      baseDepartments: dto.baseDepartments,
    });
    const putRes = await controller.updateBaseDepartmentsConfig(dto, {
      user: { id: "admin-1" },
    } as any);
    expect(service.updateBaseDepartmentsConfig).toHaveBeenCalledWith(dto, "admin-1");
    expect(putRes.totalCount).toBe(1);
  });

  it("should navigate Compras/PAC tree excluding non-commercial units (HU-020, HU-021, HU-023 / DEC-01)", async () => {
    mockStructuresService.getComprasPacTree.mockResolvedValue({
      structureType: "COMPRAS",
      decisionRef: "DEC-01",
      requiresOperationalGroups: false,
      excludeNonCommercial: true,
      excludedNonCommercialUnitsCount: 1,
      nodes: [],
    });

    const res = await controller.getComprasPacTree({
      structureType: "COMPRAS",
      excludeNonCommercial: true,
    });
    expect(res.requiresOperationalGroups).toBe(false);
  });

  it("should return Suburbia intermediate advisor node 70051507 (HU-19 / DEC-16)", async () => {
    mockStructuresService.getSuburbiaAdvisors.mockResolvedValue({
      format: "SUBURBIA",
      decisionRef: "DEC-16",
      intermediatePositionCode: "70051507",
    });

    const res = await controller.getSuburbiaAdvisors({
      locationId: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
    });
    expect(res.intermediatePositionCode).toBe("70051507");
  });

  it("should return collaborator managed sections (HU-41)", async () => {
    mockStructuresService.getCollaboratorManagedSections.mockResolvedValue({
      employeeId: "EMP-900101",
      managedSectionsCount: 3,
      managedSections: [{ code: "0129", isAnchor: true }],
    });

    const res = await controller.getCollaboratorManagedSections("EMP-900101");
    expect(res.managedSectionsCount).toBe(3);
  });

  it("should process EC inbound events and sync managed sections to EC outbox (HU-44, HU-45 / P-01)", async () => {
    mockStructuresService.processEcInboundEvent.mockResolvedValue({
      status: "PROCESSED",
      eventType: "TRANSFER",
      employeeId: "EMP-900101",
    });

    const evtRes = await controller.processEcInboundEvent(
      {
        eventType: "TRANSFER",
        employeeId: "EMP-900101",
        effectiveDate: "2026-10-19",
        anchorSectionCode: "0129",
      },
      { user: { id: "ec-tech-user" } } as any
    );
    expect(evtRes.status).toBe("PROCESSED");

    mockStructuresService.syncManagedSectionsToEc.mockResolvedValue({
      contractRef: "P-01",
      status: "SENT",
      payload: {
        employeeId: "EMP-900101",
        effectiveDate: "2026-10-19",
        managedSections: ["0129", "0130"],
      },
    });
    const syncRes = await controller.syncManagedSectionsToEc(
      { employeeId: "EMP-900101", effectiveDate: "2026-10-19" },
      { user: { id: "admin-1" } } as any
    );
    expect(syncRes.contractRef).toBe("P-01");

    mockStructuresService.getEcOutbox.mockResolvedValue({
      contractRef: "P-01",
      totalCount: 1,
      items: [],
    });
    const outboxRes = await controller.getEcOutbox("EMP-900101");
    expect(outboxRes.contractRef).toBe("P-01");
  });
});
