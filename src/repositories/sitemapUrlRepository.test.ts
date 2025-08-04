import { assert } from 'chai';
import { getLastEntry } from './sitemapUrlRepository';
import { SitemapUrl } from '../entities/sitemapUrl';
import { AppDataSource } from '../orm';

describe('sitemapUrlRepository testCases', () => {
  beforeEach(async () => {
    const sitemapUrlRepository =
      AppDataSource.getDataSource().getRepository(SitemapUrl);

    await sitemapUrlRepository.query(`DELETE FROM sitemap_url`);
  });

  it('should save a new sitemap url', async () => {
    const sitemapUrlRepository =
      AppDataSource.getDataSource().getRepository(SitemapUrl);

    const newEntry = new SitemapUrl();
    newEntry.sitemap_urls = {
      sitemapProjectsURL: 'https://giveth.io/projects',
      sitemapUsersURL: 'https://giveth.io/users',
      sitemapQFRoundsURL: 'https://giveth.io/qf-rounds',
      sitemapCausesURL: 'https://giveth.io/causes',
    };
    newEntry.created_at = new Date();

    await sitemapUrlRepository.save(newEntry);
    const savedSitemapUrl = await getLastEntry();
    assert.equal(savedSitemapUrl?.id, newEntry.id);
  });

  it('should return null if no sitemap url is found', async () => {
    const savedSitemapUrl = await getLastEntry();
    assert.equal(savedSitemapUrl, null);
  });
});
