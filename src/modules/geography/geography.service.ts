import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class GeographyService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Obtiene la lista de Zonas activas
   * UC-004 / HU-13
   */
  async getZones() {
    const rows = await this.dataSource.query(`
      SELECT 
        sn.id, 
        sn.external_code AS code, 
        sn.display_name AS name
      FROM zd_core.structure_node sn
      JOIN zd_config.level_type lt ON lt.id = sn.level_type_id
      WHERE lt.code = 'ZONE' AND sn.status = 'ACTIVE'
      ORDER BY sn.display_name ASC;
    `);
    return rows;
  }

  /**
   * Obtiene las Tiendas / Ubicaciones físicas dentro de una Zona
   * UC-004 / HU-13
   */
  async getLocations(zoneId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT 
        child.id, 
        child.external_code AS code, 
        child.display_name AS name
      FROM zd_core.structure_node_relation rel
      JOIN zd_core.structure_node child ON child.id = rel.child_node_id
      JOIN zd_config.level_type lt ON lt.id = child.level_type_id
      WHERE rel.parent_node_id = $1 
        AND lt.code = 'LOCATION' 
        AND rel.status = 'ACTIVE' 
        AND child.status = 'ACTIVE'
      ORDER BY child.display_name ASC;
      `,
      [zoneId]
    );
    return rows;
  }
}
