import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { RoleStatus } from "../../domain/role.entity";
export class SearchRolesQuery {
  @IsOptional() @MaxLength(100) search?: string;
  @IsOptional() @IsEnum(RoleStatus) status?: RoleStatus;
  @Type(() => Number) @IsInt() @Min(0) page = 0;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @Matches(/^(code|name|status|updatedAt),(asc|desc)$/) sort = "name,asc";
}
export class CreateRoleRequest {
  @IsString() @MinLength(3) @MaxLength(150) name!: string;
  @IsString() @MinLength(1) @MaxLength(500) description!: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() permissionCodes!: string[];
}
export class UpdateRoleRequest extends CreateRoleRequest {
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}
export class DeleteRoleRequest {
  @IsString() @MinLength(5) @MaxLength(500) reason!: string;
  @Type(() => Number) @IsInt() @Min(0) version!: number;
}
