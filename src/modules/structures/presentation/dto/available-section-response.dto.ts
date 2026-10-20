import { ApiProperty } from "@nestjs/swagger";

export class AvailableSectionResponseDto {
  @ApiProperty({
    description: "UUID de la sección en catálogo de referencia",
    example: "53dd523e-c6fe-5e99-8f44-620acb432a62",
  })
  id!: string;

  @ApiProperty({
    description: "Código externo oficial de la sección",
    example: "DEMO-SEC-041",
  })
  externalCode!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la sección comercial",
    example: "Sección Demo 041",
  })
  name!: string;

  @ApiProperty({
    description: "Estado en catálogo de referencia",
    example: "ACTIVE",
  })
  status!: string;

  @ApiProperty({
    description: "Fecha de inicio de vigencia",
    example: "2026-01-01",
  })
  effectiveStart!: string;
}
