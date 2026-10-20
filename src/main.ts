import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

import { DataSource } from "typeorm";

const swaggerConfig = new DocumentBuilder()
  .setTitle("ZDeptos API - Backend Integrado (Liverpool)")
  .setDescription(`
## ZDeptos: Sistema de Gestión de Departamentos Comerciales
Plataforma transaccional de misión crítica que integra:
- **Feature 01 (Seguridad y Gobernanza)**: Catálogo de permisos, administración de roles, matriz de impacto y asignaciones con alcance operativo (access scopes).
- **Feature 02 (Estructura Comercial y Grupos)**: Selectores de geografía comercial, árbol jerárquico de 6 niveles, autonumeración atómica de grupos (P-02), protección de secciones ancla 🔒 (RN-030), Drag & Drop de secciones virtuales, corte operativo y publicación departamental.
- **Feature 03 (Reportes, Historial y Cargas Masivas)**: Vistas previas dinámicas por rol y general, exportación CSV y TXT delimitado por pipes (|), consulta inmutable de auditoría (ERF §7) y validación/ejecución transaccional de cargas masivas iniciales (CU-CIN-001).
`)
  .setVersion("1.0.0")
  .addApiKey(
    {
      type: "apiKey",
      name: "x-dev-api-key",
      in: "header",
      description: "Llave de autorización local: dev-api-key-zdeptos-2026",
    },
    "dev-api-key",
  )
  .addTag("0. Sistema y Monitoreo (Health Check)", "Sondas de disponibilidad y verificación de salud de la aplicación.")
  .addTag("Feature 01: Autenticación SSO y Gestión de Sesiones (HU-01 a HU-06)", "Flujos de autenticación federada, prolongación de sesión y revocación.")
  .addTag("Feature Home & Search: Identidad, Módulos por Rol y Buscador Global (HU-07 a HU-12)", "Experiencia de bienvenida, tarjetas dinámicas de módulos y motor de búsqueda con SearchScopeEnforcer.")
  .addTag("Feature 01: Gestión de Roles y Permisos (HU-54 a HU-61)", "Creación, edición con concurrencia optimista, clonación, matriz de impacto y baja lógica de roles.")
  .addTag("Feature 01: Asignaciones de Roles y Alcance Operativo (HU-58 a HU-61)", "Asignaciones de roles con segmentación geográfica (tiendas/zonas) y excepciones.")
  .addTag("Feature 02: Geografía Comercial y Filtros en Cascada (UC-004 / HU-13)", "Catálogos de zonas comerciales y tiendas para filtros de selección.")
  .addTag("Feature 02: Estructura Comercial, Árbol y Grupos P-02 (CU-EST-001, CU-ADM-001..008 / HU-14..53)", "Consulta de árbol jerárquico recursivo, gestión de grupos operativos y Drag & Drop de secciones.")
  .addTag("Estructuras Compras, PAC, Suburbia 70051507 y Sincronización EC (HU-020..023, HU-19, HU-41, HU-44, HU-45)", "Navegación de compras y PAC, nodo Suburbia 70051507 y sincronización outbox EC.")
  .addTag("Planificación Futura, Cambios Programados y Calendario de Corte (HU-48/49, HU-049 a HU-052)", "Derivación copy-on-write de estructura futura, calendario operativo de corte y activación de periodos.")
  .addTag("Feature 03: Reportes Dinámicos y Exportación CSV / TXT (CU-EST-002, CU-EST-003 / HU-62..67)", "Vistas previas por rol y general, modelos de compensación y exportación CSV / TXT.")
  .addTag("Feature 03: Historial y Bitácora de Auditoría (CU-HIS-001 / HU-68)", "Bitácora inmutable de movimientos con filtros por fecha, acción, usuario y tienda.")
  .addTag("Feature 03: Cargas Masivas Iniciales y Layout (CU-CIN-001 / HU-69)", "Plantilla oficial y procesamiento transaccional de cargas iniciales con dryRun.")
  .build();


async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const dataSource = app.get(DataSource);

  const [databaseSession] = await dataSource.query<
    {
      current_user: string;

      session_user: string;

      current_database: string;
    }[]
  >(
    `
      SELECT
        current_user,
        session_user,
        current_database()
    `,
  );

  console.log("[Database connection]", databaseSession);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin: [
      process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Accept",
      "Content-Type",
      "Authorization",
      "X-Dev-Api-Key",
      "X-Session-Id",
      "If-Match",
      "X-Correlation-Id",
      "Idempotency-Key",
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
    },
  });
  SwaggerModule.setup("api/docs", app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "list",
      filter: true,
    },
  });

  await app.listen(Number(process.env.PORT ?? 3000));
}
void bootstrap();
