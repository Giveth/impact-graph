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
@Index(['userId', 'id'])
export class PowerSyncOutboxEvent extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'impact-graph' })
  sourceSystem: string;

  @Column()
  eventType: string;

  @Column()
  entityType: string;

  @Column()
  userId: number;

  @Column({ type: 'timestamptz' })
  sourceUpdatedAt: Date;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
