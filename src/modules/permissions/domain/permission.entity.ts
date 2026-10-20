import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoleEntity } from '../../roles/domain/role.entity';
export enum CatalogStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
@Entity({ schema: 'zd_security', name: 'permission' })
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) code!: string;
  @Column() module!: string;
  @Column() action!: string;
  @Column({ name: 'display_name' })
  displayName!: string;
  @Column() description!: string;
  @Column({ name: 'display_order' }) displayOrder!: number;
  @Column() assignable!: boolean;
  @Column() sensitive!: boolean;
  @Column() status!: CatalogStatus;
  @Column({ type: 'varchar', nullable: true }) notes!: string | null;
  @ManyToMany(() => RoleEntity, (r) => r.permissions) roles!: RoleEntity[];
}
