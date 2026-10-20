import { ApiProperty } from "@nestjs/swagger";

export class CommercialZoneResponseDto {
  @ApiProperty({
    description: "UUID de la zona geográfica comercial",
    example: "7c76789b-da9f-500c-8efb-4f9ecfe73925",
  })
  id!: string;

  @ApiProperty({
    description: "Código identificador de la zona",
    example: "ZONA-CENTRO",
  })
  code!: string;

  @ApiProperty({
    description: "Nombre descriptivo de la zona",
    example: "Metro Centro",
  })
  name!: string;
}

export class CommercialLocationResponseDto {
  @ApiProperty({
    description: "UUID de la tienda física (Location)",
    example: "f62b081e-4cc2-518a-b840-a7afa915cd3d",
  })
  id!: string;

  @ApiProperty({
    description: "Código de tienda o almacén (ej. LOC-001)",
    example: "LOC-001",
  })
  code!: string;

  @ApiProperty({
    description: "Nombre del almacén o tienda física",
    example: "Liverpool Demo Insurgentes",
  })
  name!: string;
}
