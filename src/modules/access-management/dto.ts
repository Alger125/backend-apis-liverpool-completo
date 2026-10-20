import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export enum AssignmentOrigin { GROUP_MAPPING='GROUP_MAPPING', RULE_BASED='RULE_BASED', MANUAL='MANUAL' }
export enum AccessScopeType { GLOBAL='GLOBAL', STRUCTURE_VARIANT='STRUCTURE_VARIANT', NODE='NODE' }
export class PageQuery { @Type(()=>Number) @IsInt() @Min(0) page=0; @Type(()=>Number) @IsInt() @Min(1) @Max(100) pageSize=20; @IsOptional() @IsString() @MaxLength(100) search?:string; }
export class EffectivePageQuery extends PageQuery { @IsOptional() @IsDateString() effectiveOn?:string; }
export class AccessScopeQuery extends PageQuery { @IsOptional() @IsEnum(AccessScopeType) scopeType?:AccessScopeType; @IsOptional() @IsUUID() structureVariantId?:string; }
export class ScopeSelectionDto { @IsUUID() accessScopeId!:string; @IsBoolean() includeDescendants=true; }
export class CreateAssignmentDto { @IsUUID() userId!:string; @IsUUID() roleId!:string; @IsEnum(AssignmentOrigin) origin!:AssignmentOrigin; @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>ScopeSelectionDto) scopes!:ScopeSelectionDto[]; @IsDateString() validFrom!:string; @IsOptional() @IsDateString() validTo?:string|null; @IsOptional() @IsString() @MaxLength(500) notes?:string|null; }
export class UpdateAssignmentDto { @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>ScopeSelectionDto) scopes!:ScopeSelectionDto[]; @IsDateString() validFrom!:string; @IsOptional() @IsDateString() validTo?:string|null; @IsOptional() @IsString() @MaxLength(500) notes?:string|null; @Type(()=>Number) @IsInt() @Min(0) version!:number; }
export class CreateExceptionDto { @IsUUID() userId!:string; @IsUUID() roleId!:string; @IsArray() @ArrayMinSize(1) @ValidateNested({each:true}) @Type(()=>ScopeSelectionDto) scopes!:ScopeSelectionDto[]; @IsDateString() validFrom!:string; @IsDateString() validTo!:string; @IsString() @Length(10,1000) justification!:string; @IsOptional() @IsString() @MaxLength(100) ticketReference?:string|null; }
export class UpdateExceptionDto extends CreateExceptionDto { @Type(()=>Number) @IsInt() @Min(0) version!:number; }
export class RevokeDto { @IsString() @Length(10,500) reason!:string; @Type(()=>Number) @IsInt() @Min(0) version!:number; }

/**
 * HU-017 (CU-SEC-006 FA-05 / PROP-03): Asignar el mismo rol excepcional a varios colaboradores
 */
export class BulkCreateExceptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  userIds!: string[];

  @IsUUID()
  roleId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScopeSelectionDto)
  scopes!: ScopeSelectionDto[];

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validTo!: string;

  @IsString()
  @Length(10, 1000)
  justification!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ticketReference?: string | null;
}
