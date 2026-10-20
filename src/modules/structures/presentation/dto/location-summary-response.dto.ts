import { ApiProperty } from "@nestjs/swagger";

export class LocationSummaryResponseDto {
  @ApiProperty({
    description: "UUID de la tienda física (Location)",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  id!: string;

  @ApiProperty({
    description: "Código externo de nómina / SAP de la tienda",
    example: "DEMO-LOC-001",
  })
  externalCode!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la tienda",
    example: "Liverpool Demo Insurgentes",
  })
  displayName!: string;

  @ApiProperty({
    description: "Título compuesto para encabezado visual en el frontend",
    example: "DEMO-LOC-001 - Liverpool Demo Insurgentes",
  })
  headerTitle!: string;

  @ApiProperty({
    description: "UUID de la Zona geográfica a la que pertenece la tienda",
    example: "7c76789b-da9f-500c-8efb-4f9ecfe73925",
  })
  zoneId!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la Zona comercial",
    example: "Metro Centro Demo",
  })
  zoneName!: string;

  @ApiProperty({
    description: "Formato comercial (Liverpool / Suburbia)",
    example: "Liverpool",
  })
  formatName!: string;

  @ApiProperty({
    description: "Total de departamentos comerciales activos adscritos a la tienda",
    example: 3,
  })
  totalDepartments!: number;
}
