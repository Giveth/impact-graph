import { Query, Resolver } from 'type-graphql';
import { Repository } from 'typeorm';
import { SitemapUrl } from '../entities/sitemapUrl';
import { AppDataSource } from '../orm';

@Resolver()
export class SitemapUrlResolver {
  private sitemapRepo: Repository<SitemapUrl>;

  constructor() {
    this.sitemapRepo = AppDataSource.getDataSource().getRepository(SitemapUrl);
  }

  @Query(() => SitemapUrl, { nullable: true })
  async getLastSitemap(): Promise<SitemapUrl | null> {
    const lastEntry = await this.sitemapRepo.findOne({
      where: {},
      order: {
        created_at: 'DESC',
      },
    });

    return lastEntry || null;
  }
}
