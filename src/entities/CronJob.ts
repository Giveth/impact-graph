import { Field, ID, ObjectType, Int, Float } from 'type-graphql';
import { PrimaryGeneratedColumn, Column, Entity, BaseEntity } from 'typeorm';

@ObjectType()
@Entity('job', {
  synchronize: false,
})
// Postgres cron jobs
export class CronJob extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn({ name: 'jobid' })
  readonly id: number;

  @Field()
  @Column()
  schedule: string;

  @Field()
  @Column()
  command: string;

  @Field()
  @Column({ name: 'jobname' })
  jobName: string;
}
