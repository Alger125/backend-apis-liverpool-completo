import { Test, TestingModule } from "@nestjs/testing";
import { GeographyController } from "./geography.controller";
import { GeographyService } from "./geography.service";
import { ApiKeyGuard, PermissionsGuard } from "../../shared/security/security";

describe("GeographyController", () => {
  let controller: GeographyController;
  let service: GeographyService;

  const mockGeographyService = {
    getZones: jest.fn(),
    getLocations: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeographyController],
      providers: [
        {
          provide: GeographyService,
          useValue: mockGeographyService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GeographyController>(GeographyController);
    service = module.get<GeographyService>(GeographyService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getZones", () => {
    it("should return zones array from service", async () => {
      const mockZones = [{ id: "zone-1", code: "ZN-CENTRO", name: "Metro Centro" }];
      mockGeographyService.getZones.mockResolvedValue(mockZones);

      const result = await controller.getZones();
      expect(service.getZones).toHaveBeenCalled();
      expect(result).toEqual(mockZones);
    });
  });

  describe("getLocations", () => {
    it("should return locations array for zoneId", async () => {
      const mockLocations = [{ id: "loc-1", code: "LOC-001", name: "Liverpool Insurgentes" }];
      mockGeographyService.getLocations.mockResolvedValue(mockLocations);

      const result = await controller.getLocations("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
      expect(service.getLocations).toHaveBeenCalledWith("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
      expect(result).toEqual(mockLocations);
    });
  });
});
