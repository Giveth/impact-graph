import { SitemapUrl } from '../entities/sitemapUrl';
import { AppDataSource } from '../orm';

export async function getLastEntry(): Promise<SitemapUrl | null> {
  const repository = AppDataSource.getDataSource().getRepository(SitemapUrl);
  return await repository.findOne({
    where: {},
    order: { created_at: 'DESC' },
  });
}
