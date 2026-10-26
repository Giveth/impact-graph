import { cronJobGateTestCases } from '../../../test/cronJobGateTestUtils';
import { runGenerateSitemapOnFrontend } from './generateSitemapOnFrontend';

describe(
  'runGenerateSitemapOnFrontend ENABLE_GENERATE_SITEMAP_CRONJOB gate',
  cronJobGateTestCases({
    envKey: 'ENABLE_GENERATE_SITEMAP_CRONJOB',
    run: runGenerateSitemapOnFrontend,
  }),
);
