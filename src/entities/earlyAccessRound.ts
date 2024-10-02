import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  AfterLoad,
} from 'typeorm';
import { Field, ID, ObjectType, Int, Float } from 'type-graphql';

@Entity()
@ObjectType()
export class EarlyAccessRound extends BaseEntity {
  @Field(_type => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => Int)
  @Column()
  @Index({ unique: true })
  roundNumber: number;

  @Field(() => Date)
  @Column()
  startDate: Date;

  @Field(() => Date)
  @Column()
  endDate: Date;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  roundUSDCapPerProject?: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  roundUSDCapPerUserPerProject?: number;

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'float', nullable: true })
  tokenPrice?: number;

  // Virtual Field to calculate cumulative cap per project
  @Field(() => Float, { nullable: true })
  cumulativeCapPerProject?: number;

  // Virtual Field to calculate cumulative cap per user per project
  @Field(() => Float, { nullable: true })
  cumulativeCapPerUserPerProject?: number;

  @AfterLoad()
  async calculateCumulativeCaps(): Promise<void> {
    const { cumulativeCapPerProject, cumulativeCapPerUserPerProject } =
      await EarlyAccessRound.createQueryBuilder('eaRound')
        .select('sum(eaRound.roundUSDCapPerProject)', 'cumulativeCapPerProject')
        .addSelect(
          'sum(eaRound.roundUSDCapPerUserPerProject)',
          'cumulativeCapPerUserPerProject',
        )
        .where('eaRound.roundNumber <= :roundNumber', {
          roundNumber: this.roundNumber,
        })
        .cache('cumulativeCapEarlyAccessRound-' + this.roundNumber, 300000)
        .getRawOne();

    this.cumulativeCapPerProject = parseFloat(cumulativeCapPerProject || 0);
    this.cumulativeCapPerUserPerProject = parseFloat(
      cumulativeCapPerUserPerProject || 0,
    );
  }
}