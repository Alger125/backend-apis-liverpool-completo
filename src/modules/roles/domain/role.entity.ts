import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { PermissionEntity } from '../../permissions/domain/permission.entity';

export enum RoleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

@Entity({
  schema: 'zd_security',
  name: 'role',
})
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ unique: true })
  name!: string;

  @Column()
  description!: string;

  @Column()
  status!: RoleStatus;

  @Column()
  protected!: boolean;

  @VersionColumn({
    type: 'bigint',
    transformer: {
      to: (value: number): number => value,
      from: (value: string | number): number => Number(value),
    },
  })
  version!: number;

  @Column({
    type: 'timestamp',
    name: 'deleted_at',
    nullable: true,
  })
  deletedAt!: Date | null;

  @Column({
    type: 'uuid',
    name: 'deleted_by',
    nullable: true,
  })
  deletedBy!: string | null;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @Column({
    type: 'uuid',
    name: 'created_by',
    nullable: true,
  })
  createdBy!: string | null;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;

  @Column({
    type: 'uuid',
    name: 'updated_by',
    nullable: true,
  })
  updatedBy!: string | null;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({
    schema: 'zd_security',
    name: 'role_permission',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissions!: PermissionEntity[];
}
