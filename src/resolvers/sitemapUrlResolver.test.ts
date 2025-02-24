import axios from 'axios';
import { assert } from 'chai';
import { SitemapUrl } from '../entities/sitemapUrl';
import { graphqlUrl } from '../../test/testUtils';
import { getLastSitemapUrlQuery } from '../../test/graphqlQueries';
import { AppDataSource } from '../orm';

describe('SitemapUrlResolver', () => {
  it('should return the last sitemap url', async () => {
    const sitemapUrlRepository =
      AppDataSource.getDataSource().getRepository(SitemapUrl);

    const sitemapUrl = new SitemapUrl();
    sitemapUrl.sitemap_urls = {
      sitemapProjectsURL: 'https://giveth.io/projects',
      sitemapUsersURL: 'https://giveth.io/users',
      sitemapQFRoundsURL: 'https://giveth.io/qf-rounds',
    };

    await sitemapUrlRepository.save(sitemapUrl);

    const response = await axios.post(graphqlUrl, {
      query: getLastSitemapUrlQuery,
    });

    assert.equal(response.data.data.getLastSitemap.id, sitemapUrl.id);
  });
});
