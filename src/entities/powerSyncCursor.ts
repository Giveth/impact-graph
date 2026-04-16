import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['sourceSystem'], { unique: true })
export class PowerSyncCursor extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sourceSystem: string;

  @Column({ default: 0 })
  lastEventId: number;

  @Column({ type: 'timestamptz', nullable: true })
  lastSourceUpdatedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
