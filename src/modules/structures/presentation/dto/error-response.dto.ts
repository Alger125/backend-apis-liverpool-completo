import { ApiProperty } from "@nestjs/swagger";

export class StandardErrorResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP",
    example: 400,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje descriptivo del error o regla de negocio infringida",
    example: "El grupo destino no pertenece al mismo departamento comercial o no está activo.",
  })
  message!: string;

  @ApiProperty({
    description: "Tipo de error según estándar RFC 7231",
    example: "Bad Request",
  })
  error!: string;
}

export class UnauthorizedErrorResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP 401 Unauthorized",
    example: 401,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje de autenticación fallida por omisión o clave inválida",
    example: "Credencial temporal invalida.",
  })
  message!: string;

  @ApiProperty({
    description: "Tipo de error",
    example: "Unauthorized",
  })
  error!: string;
}

export class ForbiddenErrorResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP 403 Forbidden",
    example: 403,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje de autorización insuficiente por falta de permisos requeridos",
    example: "Permiso insuficiente.",
  })
  message!: string;

  @ApiProperty({
    description: "Tipo de error",
    example: "Forbidden",
  })
  error!: string;
}

export class NotFoundErrorResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP 404 Not Found",
    example: 404,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje de recurso no encontrado en la base de datos",
    example: "No se encontró la estructura para la ubicación f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  message!: string;

  @ApiProperty({
    description: "Tipo de error",
    example: "Not Found",
  })
  error!: string;
}

export class VersionConflictResponseDto {
  @ApiProperty({
    description: "Código de error funcional de colisión de concurrencia optimista (CU-ADM-008 / DEC-06)",
    example: "DEPARTMENT_VERSION_CONFLICT",
  })
  code!: string;

  @ApiProperty({
    description: "Mensaje de conflicto por modificación simultánea por otro usuario",
    example:
      "El departamento comercial fue modificado por otro usuario simultáneamente. Se requiere recargar la vista.",
  })
  message!: string;

  @ApiProperty({
    description: "Versión actual que reside en la base de datos (para actualizar la vista cliente)",
    example: 1,
  })
  currentVersion!: number;
}

export class AnchorBlockedResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP 422 Unprocessable Entity",
    example: 422,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje de protección contractual de sección ancla fija (RN-030 / HU-37)",
    example:
      "No se permite mover una Sección Ancla entre grupos. Su adscripción es gobernada contractualmente en Employee Central.",
  })
  message!: string;

  @ApiProperty({
    description: "Tipo de error",
    example: "Unprocessable Entity",
  })
  error!: string;
}

export class GroupDeleteBlockedResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP 409 Conflict",
    example: 409,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje de bloqueo: El grupo contiene secciones ancla asociadas a contratos de vendedores (HU-25)",
    example:
      "No se puede eliminar el grupo: Contiene secciones ancla protegidas asociadas a contratos de vendedores.",
  })
  message!: string;

  @ApiProperty({
    description: "Tipo de error",
    example: "Conflict",
  })
  error!: string;
}

export class InternalServerErrorResponseDto {
  @ApiProperty({
    description: "Código de estado HTTP 500 Internal Server Error",
    example: 500,
  })
  statusCode!: number;

  @ApiProperty({
    description: "Mensaje general de error inesperado o falla en la conexión de base de datos",
    example: "Internal server error",
  })
  message!: string;
}
