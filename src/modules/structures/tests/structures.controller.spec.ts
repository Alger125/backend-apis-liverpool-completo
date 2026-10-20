import { Test, TestingModule } from "@nestjs/testing";
import { StructuresController } from "../presentation/structures.controller";
import { StructuresService } from "../application/structures.service";
import { ApiKeyGuard, PermissionsGuard } from "../../../shared/security/security";

describe("StructuresController (Planning & Schedule Lifecycle)", () => {
  let controller: StructuresController;
  let service: StructuresService;

  const mockStructuresService = {
    initFutureDraft: jest.fn(),
    listScheduledChanges: jest.fn(),
    createScheduledChange: jest.fn(),
    updateScheduledChange: jest.fn(),
    cancelScheduledChange: jest.fn(),
    activatePlannedPeriod: jest.fn(),
    configureOperationalCutoff: jest.fn(),
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

  it("should initialize future draft structure via copy-on-write (HU-48 / HU-49 / HU-047)", async () => {
    mockStructuresService.initFutureDraft.mockResolvedValue({
      alreadyInitialized: false,
      draftId: "draft-1",
      departmentId: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
      sourcePeriod: "2026-10",
      targetPeriod: "2026-11",
      strategy: "COPY_ON_WRITE",
      status: "DRAFT",
    });

    const res = await controller.initFutureDraft(
      "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
      { targetPeriod: "2026-11", sourcePeriod: "2026-10" },
      { user: { id: "user-1" } } as any
    );
    expect(service.initFutureDraft).toHaveBeenCalledWith(
      "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
      { targetPeriod: "2026-11", sourcePeriod: "2026-10" },
      "user-1"
    );
    expect(res.strategy).toBe("COPY_ON_WRITE");
  });

  it("should list, create, update, and cancel scheduled changes (HU-049, HU-050)", async () => {
    mockStructuresService.listScheduledChanges.mockResolvedValue({
      totalCount: 1,
      items: [{ changeId: "sch-1", status: "SCHEDULED" }],
    });
    const listRes = await controller.listScheduledChanges("dept-1", "2026-11", "SCHEDULED");
    expect(listRes.totalCount).toBe(1);

    const createDto = {
      departmentId: "7882a45f-8ad2-5009-8d9e-5f6f81671fc8",
      targetPeriod: "2026-11",
      effectiveDate: "2026-11-01",
      changeType: "SECTION_MOVE" as const,
      sectionId: "244c4790-517c-5b2d-bd46-8e2ae2ae035f",
      targetGroupId: "64257972-f2f8-58c6-b88e-d724c3e78cce",
    };
    mockStructuresService.createScheduledChange.mockResolvedValue({
      changeId: "sch-1",
      ...createDto,
      status: "SCHEDULED",
      version: 1,
    });
    const created = await controller.createScheduledChange(createDto, {
      user: { id: "user-1" },
    } as any);
    expect(created.status).toBe("SCHEDULED");

    mockStructuresService.updateScheduledChange.mockResolvedValue({
      changeId: "sch-1",
      effectiveDate: "2026-11-05",
      version: 2,
    });
    const updated = await controller.updateScheduledChange(
      "sch-1",
      { effectiveDate: "2026-11-05" },
      { user: { id: "user-1" } } as any
    );
    expect(updated.version).toBe(2);

    mockStructuresService.cancelScheduledChange.mockResolvedValue({
      message: "Cambio programado cancelado exitosamente.",
      change: { changeId: "sch-1", status: "CANCELLED" },
    });
    const cancelled = await controller.cancelScheduledChange(
      "sch-1",
      { reason: "Ajuste pre-cierre" },
      { user: { id: "user-1" } } as any
    );
    expect(cancelled.change.status).toBe("CANCELLED");
  });

  it("should activate planned period on effective date and archive previous snapshot (HU-051)", async () => {
    mockStructuresService.activatePlannedPeriod.mockResolvedValue({
      activatedPeriod: "2026-11",
      newStatus: "ACTIVE",
      previousPeriodSnapshot: {
        periodCode: "2026-10",
        archivedStatus: "HISTORICAL",
        snapshotPreserved: true,
      },
      appliedScheduledChangesCount: 2,
    });

    const res = await controller.activatePlannedPeriod(
      "2026-11",
      { recalculateManagedSections: true, notes: "Inicio de mes" },
      { user: { id: "admin-1" } } as any
    );
    expect(res.newStatus).toBe("ACTIVE");
  });

  it("should configure operational cutoff calendar and lock flag (HU-052)", async () => {
    mockStructuresService.configureOperationalCutoff.mockResolvedValue({
      period: "2026-10",
      editingWindowDays: 15,
      cutoffDayOfMonth: 25,
      isLockedByCalculation: false,
      isEditable: true,
      status: "OPEN",
    });

    const res = await controller.configureOperationalCutoff(
      {
        period: "2026-10",
        editingWindowDays: 15,
        cutoffDayOfMonth: 25,
        isLockedByCalculation: false,
      },
      { user: { id: "admin-1" } } as any
    );
    expect(res.editingWindowDays).toBe(15);
  });
});
