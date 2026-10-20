import { ApiProperty } from "@nestjs/swagger";

export class AggregatedSectionResponseDto {
  @ApiProperty({
    description: "UUID de la sección en catálogo de referencia",
    example: "39a5a133-10f6-59a6-bccc-fb193f12b2eb",
  })
  id!: string;

  @ApiProperty({
    description: "Código externo oficial de la sección (external_code)",
    example: "DEMO-SEC-001",
  })
  code!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la sección comercial",
    example: "Perfumería Fina y Cosméticos",
  })
  name!: string;

  @ApiProperty({
    description: "Origen de la adscripción comercial (ANCHOR vs MANUAL / INITIAL_LOAD)",
    example: "ANCHOR",
  })
  assignmentOrigin!: string;

  @ApiProperty({
    description: "Indica si la sección es un ancla fija con candado 🔒",
    example: true,
  })
  isAnchor!: boolean;

  @ApiProperty({
    description: "UUID del grupo operativo al que está adscrita actualmente",
    example: "bcaa1780-4754-5a53-ad59-08d51b541b2b",
  })
  groupId!: string;

  @ApiProperty({
    description: "Código visible del grupo operativo",
    example: "DEMO-GRP-01-01",
  })
  groupCode!: string;

  @ApiProperty({
    description: "Nombre descriptivo del grupo operativo",
    example: "Grupo Belleza 1 Demo",
  })
  groupName!: string;

  @ApiProperty({
    description: "Cantidad de colaboradores adscritos a esta sección por su puesto",
    example: 1,
  })
  collaboratorsCount!: number;
}
