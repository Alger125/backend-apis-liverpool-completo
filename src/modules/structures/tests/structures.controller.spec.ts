import { Test, TestingModule } from "@nestjs/testing";
import { StructuresController } from "../presentation/structures.controller";
import { StructuresService } from "../application/structures.service";
import { ApiKeyGuard, PermissionsGuard } from "../../../shared/security/security";

describe("StructuresController", () => {
  let controller: StructuresController;
  let service: StructuresService;

  const mockStructuresService = {
    getTree: jest.fn(),
    getLocationSummary: jest.fn(),
    getDepartmentGroups: jest.fn(),
    getAggregatedSections: jest.fn(),
    getAvailableSections: jest.fn(),
    createGroup: jest.fn(),
    updateGroupName: jest.fn(),
    deleteGroup: jest.fn(),
    moveSection: jest.fn(),
    assignSection: jest.fn(),
    unassignSection: jest.fn(),
    getOperationalCutoff: jest.fn(),
    publishDepartment: jest.fn(),
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

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getTree", () => {
    it("should call service.getTree with locationId and period", async () => {
      const mockResult = {
        id: "loc-1",
        displayName: "Liverpool Insurgentes",
        levelType: "LOCATION",
        children: [],
        isReadOnly: false,
        periodCode: "2026-10",
      };
      mockStructuresService.getTree.mockResolvedValue(mockResult);

      const result = await controller.getTree({
        locationId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        period: "2026-10",
      });

      expect(service.getTree).toHaveBeenCalledWith(
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "2026-10"
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("getLocationSummary", () => {
    it("should call service.getLocationSummary with locationId", async () => {
      const mockSummary = {
        id: "loc-1",
        externalCode: "LOC-001",
        displayName: "Liverpool Insurgentes",
        headerTitle: "LOC-001 - Liverpool Insurgentes",
        zoneId: "zone-1",
        zoneName: "Metro Centro",
        formatName: "Liverpool",
        totalDepartments: 3,
      };
      mockStructuresService.getLocationSummary.mockResolvedValue(mockSummary);

      const result = await controller.getLocationSummary("loc-1");
      expect(service.getLocationSummary).toHaveBeenCalledWith("loc-1");
      expect(result).toEqual(mockSummary);
    });
  });

  describe("getDepartmentGroups", () => {
    it("should call service.getDepartmentGroups with departmentId", async () => {
      const mockGroups = [
        {
          id: "grp-1",
          sequenceNumber: 1,
          displayCode: "Grupo 001",
          name: "Línea Blanca",
          sections: [],
          collaborators: [],
        },
      ];
      mockStructuresService.getDepartmentGroups.mockResolvedValue(mockGroups);

      const result = await controller.getDepartmentGroups("dept-1");
      expect(service.getDepartmentGroups).toHaveBeenCalledWith("dept-1");
      expect(result).toEqual(mockGroups);
    });
  });

  describe("getAggregatedSections", () => {
    it("should call service.getAggregatedSections with departmentId", async () => {
      const mockAggregated = [
        {
          id: "sec-1",
          code: "SEC-001",
          name: "Perfumería",
          assignmentOrigin: "ANCHOR",
          isAnchor: true,
          groupId: "grp-1",
          groupCode: "Grupo 001",
          groupName: "Belleza",
          collaboratorsCount: 2,
        },
      ];
      mockStructuresService.getAggregatedSections.mockResolvedValue(mockAggregated);

      const result = await controller.getAggregatedSections("dept-1");
      expect(service.getAggregatedSections).toHaveBeenCalledWith("dept-1");
      expect(result).toEqual(mockAggregated);
    });
  });

  describe("getAvailableSections", () => {
    it("should call service.getAvailableSections with departmentId", async () => {
      const mockAvailable = [
        {
          id: "sec-41",
          externalCode: "DEMO-SEC-041",
          name: "Sección Demo 041",
          status: "ACTIVE",
          effectiveStart: "2026-01-01",
        },
      ];
      mockStructuresService.getAvailableSections.mockResolvedValue(mockAvailable);

      const result = await controller.getAvailableSections("dept-1");
      expect(service.getAvailableSections).toHaveBeenCalledWith("dept-1");
      expect(result).toEqual(mockAvailable);
    });
  });

  describe("createGroup", () => {
    it("should call service.createGroup with departmentId, name, clientVersion, and userId", async () => {
      const mockCreatedGroup = {
        id: "grp-1",
        displayCode: "Grupo 001",
        name: "Línea Blanca",
      };
      mockStructuresService.createGroup.mockResolvedValue(mockCreatedGroup);

      const result = await controller.createGroup(
        "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        { name: "Línea Blanca" },
        '"1"',
        { user: { id: "user-1" } } as any
      );

      expect(service.createGroup).toHaveBeenCalledWith(
        "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        "Línea Blanca",
        1,
        "user-1"
      );
      expect(result).toEqual(mockCreatedGroup);
    });
  });

  describe("updateGroupName", () => {
    it("should call service.updateGroupName with groupId, name, clientVersion, and userId", async () => {
      mockStructuresService.updateGroupName.mockResolvedValue({ id: "grp-1", name: "Nuevo Nombre" });

      const result = await controller.updateGroupName(
        "grp-1",
        { name: "Nuevo Nombre" },
        '"2"',
        { user: { id: "user-1" } } as any
      );
      expect(service.updateGroupName).toHaveBeenCalledWith("grp-1", "Nuevo Nombre", 2, "user-1");
      expect(result).toEqual({ id: "grp-1", name: "Nuevo Nombre" });
    });
  });

  describe("deleteGroup", () => {
    it("should call service.deleteGroup with groupId, clientVersion, and userId", async () => {
      mockStructuresService.deleteGroup.mockResolvedValue({ message: "Inactivado" });

      const result = await controller.deleteGroup(
        "grp-1",
        '"2"',
        { user: { id: "user-1" } } as any
      );
      expect(service.deleteGroup).toHaveBeenCalledWith("grp-1", 2, "user-1");
      expect(result).toEqual({ message: "Inactivado" });
    });
  });

  describe("moveSection", () => {
    it("should call service.moveSection with optimistic lock clientVersion and userId", async () => {
      mockStructuresService.moveSection.mockResolvedValue({ message: "Movido" });

      const result = await controller.moveSection(
        "dept-1",
        {
          sectionId: "sec-1",
          targetGroupId: "grp-2",
        },
        '"3"',
        { user: { id: "user-1" } } as any
      );

      expect(service.moveSection).toHaveBeenCalledWith(
        "dept-1",
        "sec-1",
        "grp-2",
        3,
        "user-1"
      );
      expect(result).toEqual({ message: "Movido" });
    });
  });

  describe("assignSection", () => {
    it("should call service.assignSection with groupId, sectionId, clientVersion, and userId", async () => {
      const mockAssignResult = {
        message: "Asignado",
        assignmentId: "asg-1",
        groupId: "grp-1",
        sectionId: "sec-1",
        sectionCode: "SEC-001",
        assignmentOrigin: "MANUAL",
        newDepartmentVersion: 2,
      };
      mockStructuresService.assignSection.mockResolvedValue(mockAssignResult);

      const result = await controller.assignSection(
        "grp-1",
        { sectionId: "sec-1" },
        '"1"',
        { user: { id: "user-1" } } as any
      );

      expect(service.assignSection).toHaveBeenCalledWith("grp-1", "sec-1", 1, "user-1");
      expect(result).toEqual(mockAssignResult);
    });
  });

  describe("unassignSection", () => {
    it("should call service.unassignSection with groupId, sectionId, clientVersion, and userId", async () => {
      const mockUnassignResult = {
        message: "Desasignado",
        groupId: "grp-1",
        sectionId: "sec-1",
        newDepartmentVersion: 3,
      };
      mockStructuresService.unassignSection.mockResolvedValue(mockUnassignResult);

      const result = await controller.unassignSection(
        "grp-1",
        "sec-1",
        '"2"',
        { user: { id: "user-1" } } as any
      );

      expect(service.unassignSection).toHaveBeenCalledWith("grp-1", "sec-1", 2, "user-1");
      expect(result).toEqual(mockUnassignResult);
    });
  });

  describe("getOperationalCutoff", () => {
    it("should call service.getOperationalCutoff with period", async () => {
      const mockCutoff = {
        periodCode: "2026-10",
        status: "OPEN",
        editingStart: "2026-09-15T06:00:00.000Z",
        editingEnd: "2026-10-01T05:59:59.000Z",
        isEditable: true,
        daysRemaining: 15,
        cutoffDate: "2026-10-01",
      };
      mockStructuresService.getOperationalCutoff.mockResolvedValue(mockCutoff);

      const result = await controller.getOperationalCutoff({ period: "2026-10" });
      expect(service.getOperationalCutoff).toHaveBeenCalledWith("2026-10");
      expect(result).toEqual(mockCutoff);
    });
  });

  describe("publishDepartment", () => {
    it("should call service.publishDepartment with departmentId, dto, clientVersion, and userId", async () => {
      const mockPublishResult = {
        message: "Publicado",
        departmentId: "dept-1",
        periodCode: "2026-10",
        version: 4,
        publishedAt: "2026-10-13T20:00:00.000Z",
        totalGroups: 2,
        totalSections: 4,
      };
      mockStructuresService.publishDepartment.mockResolvedValue(mockPublishResult);

      const result = await controller.publishDepartment(
        "dept-1",
        { period: "2026-10", notes: "Aprobado" },
        '"3"',
        { user: { id: "user-1" } } as any
      );

      expect(service.publishDepartment).toHaveBeenCalledWith(
        "dept-1",
        { period: "2026-10", notes: "Aprobado" },
        3,
        "user-1"
      );
      expect(result).toEqual(mockPublishResult);
    });
  });
});
