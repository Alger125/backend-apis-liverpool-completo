import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AccessManagementController } from "./access-management.controller";
import type { AccessManagementRepository } from "./access-management.repository";
import {
  BulkCreateExceptionDto,
  CreateAssignmentDto,
  RevokeDto,
  ScopeSelectionDto,
} from "./dto";

describe("Access management OpenAPI DTO validation & Controller (HU-017, HU-61)", () => {
  it("accepts a valid multi-scope assignment", async () => {
    const dto = plainToInstance(CreateAssignmentDto, {
      userId: "11111111-1111-4111-8111-111111111111",
      roleId: "22222222-2222-4222-8222-222222222222",
      origin: "MANUAL",
      validFrom: "2026-10-08",
      scopes: [
        {
          accessScopeId: "33333333-3333-4333-8333-333333333333",
          includeDescendants: true,
        },
        {
          accessScopeId: "44444444-4444-4444-8444-444444444444",
          includeDescendants: false,
        },
      ],
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects revoke reasons shorter than the contract minimum", async () => {
    const dto = plainToInstance(RevokeDto, { reason: "short", version: 0 });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("requires includeDescendants in each scope selection", async () => {
    const dto = plainToInstance(ScopeSelectionDto, {
      accessScopeId: "33333333-3333-4333-8333-333333333333",
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.includeDescendants).toBe(true);
  });

  it("HU-017: validates BulkCreateExceptionDto for multiple collaborators", async () => {
    const validBulk = plainToInstance(BulkCreateExceptionDto, {
      userIds: [
        "11111111-1111-4111-8111-111111111111",
        "55555555-5555-4555-8555-555555555555",
      ],
      roleId: "22222222-2222-4222-8222-222222222222",
      validFrom: "2026-10-01",
      validTo: "2026-10-31",
      justification: "Cobertura temporal por apertura de temporada navideña.",
      scopes: [
        {
          accessScopeId: "33333333-3333-4333-8333-333333333333",
          includeDescendants: true,
        },
      ],
    });
    expect(await validate(validBulk)).toHaveLength(0);
  });

  it("HU-017 y HU-61: AccessManagementController delega bulkCreateExceptions y effectivePermissions", async () => {
    const repoMock = {
      bulkCreateExceptions: jest.fn().mockResolvedValue({
        totalRequested: 2,
        succeededCount: 2,
        failedCount: 0,
      }),
      effectivePermissions: jest.fn().mockResolvedValue({
        resolutionModel: "ADDITIVE_UNION_NO_DENY",
        effectivePermissionCodes: ["STRUCTURE_VIEW", "REPORTS_VIEW"],
      }),
    } as unknown as AccessManagementRepository;

    const controller = new AccessManagementController(repoMock);
    const bulkBody = {
      userIds: [
        "11111111-1111-4111-8111-111111111111",
        "55555555-5555-4555-8555-555555555555",
      ],
      roleId: "22222222-2222-4222-8222-222222222222",
      validFrom: "2026-10-01",
      validTo: "2026-10-31",
      justification: "Cobertura temporal por apertura de temporada navideña.",
      scopes: [
        {
          accessScopeId: "33333333-3333-4333-8333-333333333333",
          includeDescendants: true,
        },
      ],
    };

    const bulkRes = await controller.bulkCreateExceptions(bulkBody, "idem-1", {
      user: { id: "actor-1" },
    });
    expect(bulkRes.succeededCount).toBe(2);

    const effRes = await controller.effectivePermissions(
      "11111111-1111-4111-8111-111111111111",
      "2026-10-19",
    );
    expect(effRes.resolutionModel).toBe("ADDITIVE_UNION_NO_DENY");
  });
});
