import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { Field, ObjectType } from 'type-graphql';

@ObjectType()
export class SitemapUrlsObject {
  @Field()
  sitemapProjectsURL: string;

  @Field()
  sitemapUsersURL: string;

  @Field()
  sitemapQFRoundsURL: string;
}

@ObjectType()
@Entity({ name: 'sitemap_url' })
export class SitemapUrl {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => SitemapUrlsObject)
  @Column({ type: 'jsonb', nullable: false })
  sitemap_urls: SitemapUrlsObject;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
