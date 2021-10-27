import { Field, ID, Float, ObjectType, Authorized } from 'type-graphql'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  RelationId,
  JoinTable,
  BaseEntity,
  OneToMany,
  Index,
  MoreThan,
  LessThan,
  Brackets,
  SelectQueryBuilder,
  AfterUpdate
} from 'typeorm'

import { Organisation } from './organisation'
import { Donation } from './donation'
import { Reaction } from './reaction'
import { Category } from './category'
import { User } from './user'
import { ProjectStatus } from './projectStatus'
import ProjectTracker from '../services/segment/projectTracker'

export enum ProjStatus {
  rjt = 1,
  pen = 2,
  clr = 3,
  ver = 4,
  active = 5,
  deactive = 6,
  cancel = 7
}

// tslint:disable-next-line:no-var-requires
const moment = require('moment');

@Entity()
@ObjectType()
class Project extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field()
  @Column()
  title: string

  @Index()
  @Field({ nullable: true })
  @Column({ nullable: true })
  slug?: string

  @Index()
  @Field(type => [String] ,{ nullable: true })
  @Column( 'text',{ array:true, nullable: true })
  slugHistory?: string[]

  @Field({ nullable: true })
  @Column({ nullable: true })
  admin?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  organisationId?: number

  @Field({ nullable: true })
  @Column({ nullable: true })
  creationDate: Date

  @Field(type => [Organisation])
  @ManyToMany(type => Organisation)
  @JoinTable()
  organisations: Organisation[]

  @Field({ nullable: true })
  @Column({ nullable: true })
  coOrdinates?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  image?: string

  @Field({ nullable: true })
  @Column({ nullable: true })
  impactLocation?: string

  @Field(type => [Category], { nullable: true })
  @ManyToMany(
    type => Category,
    category => category.projects,
    { nullable: true, eager: true, cascade: true }
  )
  @JoinTable()
  categories: Category[]

  @Field(type => Float, { nullable: true })
  @Column('float', { nullable: true })
  balance: number = 0

  @Field({ nullable: true })
  @Column({ nullable: true })
  stripeAccountId?: string

  @Field()
  @Column({ unique: true })
  walletAddress?: string

  @Field(type => Boolean)
  @Column()
  verified: boolean

  @Field(type => Boolean)
  @Column()
  giveBacks: boolean

  @Field(type => [Donation], { nullable: true })
  @OneToMany(
    type => Donation,
    donation => donation.project
  )
  donations?: Donation[]

  @Field(type => Float, { nullable: true })
  @Column({ nullable: true })
  qualityScore: number = 0

  @ManyToMany(
    type => User,
    user => user.projects,
    { eager: true }
  )
  @JoinTable()
  @Field(type => [User], { nullable: true })
  users: User[]

  @Field(type => [Reaction], { nullable: true })
  @OneToMany(
    type => Reaction,
    reaction => reaction.project
  )
  reactions?: Reaction[]

  @Index()
  @Field(type => ProjectStatus)
  @ManyToOne(type => ProjectStatus, { eager: true })
  status: ProjectStatus

  @RelationId((project: Project) => project.status)
  statusId: number

  @Field(type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true })
  totalDonations: number = 0

  @Field(type => Float, { nullable: true })
  @Column({ type: 'real', nullable: true })
  totalHearts: number = 0

  @Field(type => Boolean)
  @Column({ default: true, nullable: false })
  listed: boolean = true

  /**
   * Custom Query Builders to chain together
   */

  static addCategoryQuery(query: SelectQueryBuilder<Project>, category: string) {
    return query.innerJoin(
      'project.categories',
      'category',
      'category.name = :category',
      { category }
    )
  }

  static addSearchQuery(query: SelectQueryBuilder<Project>, searchTerm: string) {
    return query.andWhere(new Brackets(qb => {
      qb.where('project.title ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
        .orWhere('project.description ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
        .orWhere('project.impactLocation ILIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
    }))
  }

  static addCustomDateQuery(query: SelectQueryBuilder<Project>, sortBy: string, direction: any) {
    const thirtyDaysAgo = moment().subtract(30, 'days')

    if (sortBy === 'recentProjects') query.andWhere(new Brackets(qb => {
      qb.where({ creationDate: MoreThan(thirtyDaysAgo) })
    }))

    if (sortBy === 'oldProjects') query.andWhere(new Brackets(qb => {
      qb.where({ creationDate: LessThan(thirtyDaysAgo) })
    }))

    return query.orderBy(`project.creationDate`, direction)
  }

  // Precalculates de amount of reactions and alias it during query execution for ordering
  static addReactionsCountQuery(query: SelectQueryBuilder<Project>, direction: any) {
    return query.addSelect((subQuery) => {
      return subQuery
          .select('COUNT(r.id)', 'count')
          .from(Reaction, 'r')
          .where('r.projectId = project.id');
      }, 'count')
    .orderBy('count', direction)
  }

  // Precalculates the sum of donations and alias it during query execution for ordering
  static addTotalDonationsQuery(query: SelectQueryBuilder<Project>, direction: any) {
    query.addSelect('SUM(donations.amount) as totalDonated')
         .groupBy('project.id, donations.id, reactions.id, status.id, users.id, c.id')

    if (direction === 'ASC') {
      return query.orderBy('totalDonated', direction, 'NULLS FIRST')
    } else {
      return query.orderBy('totalDonated', direction, 'NULLS LAST')
    }
  }

  // Backward Compatible Projects Query with added pagination, frontend sorts and category search
  static searchProjects(limit: number, offset: number, sortBy: string, direction: any, category: string, searchTerm: string) {
    const query = this.createQueryBuilder('project')
               .leftJoinAndSelect('project.status', 'status')
               .leftJoinAndSelect('project.donations', 'donations')
               .leftJoinAndSelect('project.reactions', 'reactions')
               .leftJoinAndSelect('project.users', 'users')
               .innerJoinAndSelect('project.categories', 'c')
               .where('project.statusId = 5 AND project.listed = true')

    if (category) this.addCategoryQuery(query, category)
    if (searchTerm) this.addSearchQuery(query, searchTerm)

    if (sortBy === 'recentProjects' || sortBy === 'oldProjects') {
      this.addCustomDateQuery(query, sortBy, direction)
    } else if (sortBy === 'reactions') {
      this.addReactionsCountQuery(query, direction)
    } else if (sortBy === 'totalDonations') {
      this.addTotalDonationsQuery(query, direction)
    } else {
      query.orderBy(`project.${sortBy}`, direction)
    }

    return query.limit(limit)
                .offset(offset)
                .getManyAndCount()
  }

  static notifySegment(project: any, eventName: string) {
    new ProjectTracker(project, eventName).track()
  }

  @Field(type => Float, { nullable: true })
  reactionsCount () {
    return this.reactions ? this.reactions.length : 0
  }

  // Status 7 is deleted status
  mayUpdateStatus (user: User) {
    if (this.statusId === ProjStatus.cancel) return false

    if (this.users.filter(o => o.id === user.id).length > 0) {
      return true
    } else {
      return false
    }
  }

  /**
   * Add / remove a heart to the score
   * @param loved true to add a heart, false to remove
   */
  updateQualityScoreHeart (loved: boolean) {
    if (loved) {
      this.qualityScore = this.qualityScore + 10
    } else {
      this.qualityScore = this.qualityScore - 10
    }
  }

  owner () {
    return this.users[0]
  }

  @AfterUpdate()
  notifyProjectEdited() {
    Project.notifySegment(this, 'Project edited')
  }
}

@Entity()
@ObjectType()
class ProjectUpdate extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  readonly id: number

  @Field(type => String)
  @Column()
  title: string

  @Field(type => ID)
  @Column()
  projectId: number

  @Field(type => ID)
  @Column()
  userId: number

  @Field(type => String)
  @Column()
  content: string

  @Field(type => Date)
  @Column()
  createdAt: Date

  @Field(type => Boolean)
  @Column({ nullable: true })
  isMain: boolean
}

export { Project, Category, ProjectUpdate }
