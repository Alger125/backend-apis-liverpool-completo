export abstract class RoleDomainError extends Error {
  protected constructor(
    readonly code: string,
    message: string,
    readonly currentVersion?: number
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class RoleNotFoundError extends RoleDomainError {
  constructor() {
    super('ROLE_NOT_FOUND', 'El rol solicitado no existe.');
  }
}

export class RoleDeletedError extends RoleDomainError {
  constructor(readonly version?: number) {
    super('ROLE_DELETED', 'El rol ya se encuentra eliminado.', version);
  }
}

export class RoleProtectedError extends RoleDomainError {
  constructor() {
    super('ROLE_PROTECTED', 'El rol protegido no puede eliminarse.');
  }
}

export class RoleVersionConflictError extends RoleDomainError {
  constructor(currentVersion: number) {
    super('ROLE_VERSION_CONFLICT', 'El rol fue modificado por otro usuario.', currentVersion);
  }
}

export class RoleCodeConflictError extends RoleDomainError {
  constructor() {
    super('ROLE_CODE_CONFLICT', 'El código técnico del rol ya está registrado.');
  }
}

export class PermissionNotFoundError extends RoleDomainError {
  constructor(readonly permissionCodes: string[]) {
    super('PERMISSION_NOT_FOUND', 'Uno o más códigos de permiso no existen o no están activos.');
  }
}

export class PermissionNotAssignableError extends RoleDomainError {
  constructor(readonly permissionCodes: string[]) {
    super('PERMISSION_NOT_ASSIGNABLE', 'Uno o más permisos no pueden asignarse a un rol.');
  }
}
