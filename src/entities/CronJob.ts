import { Field, ID, ObjectType, Int, Float } from 'type-graphql';
import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BaseEntity,
  JoinTable,
} from 'typeorm';
import { Project, ProjStatus } from './project';
import { Donation } from './donation';
import { Reaction } from './reaction';
import { AccountVerification } from './accountVerification';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ProjectVerificationForm } from './projectVerificationForm';
import { UserPower } from './userPower';
import { PowerBoosting } from './powerBoosting';
import { findPowerBoostingsCountByUserId } from '../repositories/powerBoostingRepository';

@ObjectType()
@Entity('job', {
  schema: 'cron',
  synchronize: false,
})
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
