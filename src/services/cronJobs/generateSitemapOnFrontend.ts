/**
 * This cron job is responsible for generating sitemaps that FE will use for SEO.
 *
 * It is scheduled to run every Sunday at 00:17.
 */
import fs from 'fs';
import { schedule } from 'node-cron';
import config from '../../config';
import { logger } from '../../utils/logger';
import { Project, ProjStatus } from '../../entities/project';
import { User } from '../../entities/user';
import { QfRound } from '../../entities/qfRound';
import { SitemapUrl } from '../../entities/sitemapUrl';
import { pinFile, getPinata } from '../../middleware/pinataUtils';
import { AppDataSource } from '../../orm';

const TEMP_PROJECT_FILE_NAME = 'sitemap-projects.xml';
const TEMP_USERS_FILE_PATH = 'sitemap-users.xml';
const TEMP_QFRONDS_FILE_PATH = 'sitemap-qfronds.xml';

// Every Sunday at 00:00
const cronJobTime =
  (config.get('GENERATE_SITEMAP_CRONJOB_EXPRESSION') as string) || '0 0 * * 0';

const FRONTEND_URL = process.env.FRONTEND_URL || '';

export const runGenerateSitemapOnFrontend = () => {
  logger.debug(
    'runGenerateSitemapOnFrontend() has been called, cronJobTime:',
    cronJobTime,
  );

  schedule(cronJobTime, async () => {
    logger.debug('runGenerateSitemapOnFrontend() job has started');
    try {
      if (!FRONTEND_URL || FRONTEND_URL.trim() === '') {
        logger.error(
          'FRONTEND_URL is not defined in the environment variables',
        );
        return;
      }

      // Create and save projects sitemap
      const projects = await fetchProjects();

      // Generate XML content
      const validProjects = projects.filter(
        (p): p is Project & { slug: string } =>
          p.slug !== null && p.slug !== undefined,
      );

      const sitemapProjectsContent = generateProjectsSiteMap(validProjects);

      await saveSitemapToFile(sitemapProjectsContent, TEMP_PROJECT_FILE_NAME);

      const sitemapProjectsURL = await uploadSitemapToPinata(
        TEMP_PROJECT_FILE_NAME,
      );

      logger.debug('Sitemap Projects URL:', sitemapProjectsURL);

      // Create and save users sitemap
      const users = await fetchUsers();

      const sitemapUsersContent = generateUsersSiteMap(users);

      await saveSitemapToFile(sitemapUsersContent, TEMP_USERS_FILE_PATH);

      const sitemapUsersURL = await uploadSitemapToPinata(TEMP_USERS_FILE_PATH);

      logger.debug('Sitemap Users URL:', sitemapUsersURL);

      // Create and save qfRounds sitemap
      const qfRounds = await fetchQFRounds();

      const sitemapQFRoundsContent = generateQFRoundsSiteMap(qfRounds);

      await saveSitemapToFile(sitemapQFRoundsContent, TEMP_QFRONDS_FILE_PATH);

      const sitemapQFRoundsURL = await uploadSitemapToPinata(
        TEMP_QFRONDS_FILE_PATH,
      );

      logger.debug('Sitemap QFRounds URL:', sitemapQFRoundsURL);

      await updateSitemapInDB(
        sitemapProjectsURL,
        sitemapUsersURL,
        sitemapQFRoundsURL,
      );
    } catch (error) {
      logger.error('runGenerateSitemapOnFrontend() error:', error.message);
    }
    logger.debug('runGenerateSitemapOnFrontend() job has finished');
  });
};

const fetchProjects = async () => {
  try {
    const projects = await Project.createQueryBuilder('project')
      .select(['project.title', 'project.slug', 'project.descriptionSummary'])
      .where('project.slug IS NOT NULL')
      .where('project.statusId= :statusId', { statusId: ProjStatus.active })
      .getMany();

    return projects;
  } catch (error) {
    logger.error('Error fetching projects:', error.message);
    return [];
  }
};

const fetchUsers = async () => {
  try {
    const users = await User.createQueryBuilder('user')
      .select(['user.firstName', 'user.lastName', 'user.walletAddress'])
      .getMany();

    return users;
  } catch (error) {
    logger.error('Error fetching users:', error.message);
    return [];
  }
};

const fetchQFRounds = async () => {
  try {
    const qfRounds = await QfRound.createQueryBuilder('qf_round')
      .select(['qf_round.slug', 'qf_round.name', 'qf_round.description'])
      .getMany();

    return qfRounds;
  } catch (error) {
    logger.error('Error fetching qfRounds:', error.message);
    return [];
  }
};

export function escapeXml(unsafe: string): string {
  // Remove invalid XML characters
  const sanitized = unsafe.replace(/[^\x20-\x7E]/g, '');

  // Escape XML special characters
  return sanitized
    .replace(/&/g, '&amp;') // Escape ampersand
    .replace(/</g, '&lt;') // Escape less-than
    .replace(/>/g, '&gt;') // Escape greater-than
    .replace(/"/g, '&quot;') // Escape double quote
    .replace(/'/g, '&apos;'); // Escape single quote
}

/**
 * Generate sitemap XML dynamically
 */
function generateProjectsSiteMap(
  projects: Array<{
    slug: string;
    title?: string;
    descriptionSummary?: string;
  }>,
) {
  const baseUrl = getFrontEndFullUrl();

  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
    ${projects
      .map(({ slug, title = '', descriptionSummary = '' }) => {
        return `
            <url>
              <loc>${`${baseUrl}/project/${slug}`}</loc>
              <title>${escapeXml(title)}</title>
              <description>${escapeXml(descriptionSummary)}</description>
            </url>
          `;
      })
      .join('')}
  </urlset>`;
}

const getFrontEndFullUrl = () => {
  let URL = process.env.FRONTEND_URL || 'https://giveth.io';

  if (!URL.startsWith('https://')) {
    URL = URL.replace(/^http:/, 'https:');
  }

  return URL;
};

const shortenAddress = (
  address: string | null | undefined,
  charsLength = 4,
) => {
  const prefixLength = 2; // "0x"
  if (!address) {
    return '';
  }
  if (address.length < charsLength * 2 + prefixLength) {
    return address;
  }
  return `${address.slice(0, charsLength + prefixLength)}…${address.slice(
    -charsLength,
  )}`;
};

// Function to generate the XML sitemap for users
function generateUsersSiteMap(users: User[]) {
  const baseUrl = getFrontEndFullUrl();

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
      ${users
        .filter(({ walletAddress }) => walletAddress !== null)
        .map(({ name = '', walletAddress = '' }) => {
          const userUrl = `/user/${walletAddress.toLowerCase()}`;
          const safeName = escapeXml(
            name || shortenAddress(walletAddress.toLowerCase()) || '\u200C',
          );

          return `
              <url>
                <loc>${baseUrl}${userUrl}</loc>
                <title>${safeName}</title>
              </url>
            `;
        })
        .join('')}
    </urlset>`;
}

function generateQFRoundsSiteMap(rounds: QfRound[]) {
  const baseUrl = getFrontEndFullUrl();

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
      ${rounds
        .map(
          ({
            slug,
            name = '',
            description = '',
          }: {
            slug: string;
            name?: string;
            description?: string;
          }) => {
            // Default to empty strings if any field is null
            const safeSlug = slug || '';
            const safeName = name || '';
            const safeDescription = description || '';

            return `
              <url>
                <loc>${`${baseUrl}/qf-archive/${safeSlug}`}</loc>
                <title>${escapeXml(safeName)}</title>
                <description>${escapeXml(safeDescription)}</description>
              </url>
            `;
          },
        )
        .join('')}
    </urlset>`;
}

/**
 * Save sitemap to temporary file
 */
async function saveSitemapToFile(sitemapContent: string, fileName: string) {
  try {
    fs.writeFileSync(`/tmp/${fileName}`, sitemapContent, 'utf-8');
  } catch (error) {
    logger.error('Error saving sitemap file:', error);
  }
}

/**
 * Upload `sitemap.xml` to Pinata
 */
async function uploadSitemapToPinata(fileName: string) {
  try {
    const fileStream = fs.createReadStream(`/tmp/${fileName}`);
    const response = await pinFile(fileStream, fileName);

    const newCID = response.IpfsHash;

    await cleanupOldPins(fileName);

    const sitemapURL = `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${newCID}`;

    return sitemapURL;
  } catch (error) {
    logger.error('Error uploading sitemap:', error);
  }
  return '';
}

/**
 * Remove old versions of `sitemap.xml` from Pinata
 */
async function cleanupOldPins(fileName: string) {
  try {
    const pinata = getPinata();
    const pinnedFiles = await pinata.pinList({
      status: 'pinned',
      metadata: {
        name: fileName,
        keyvalues: {},
      },
    });

    for (const file of pinnedFiles.rows) {
      await pinata.unpin(file.ipfs_pin_hash);
    }

    logger.debug('Old sitemap versions cleaned up.');
  } catch (error) {
    logger.error('Error cleaning up old sitemap versions:', error);
  }
}

export const updateSitemapInDB = async (
  sitemapProjectsURL: string,
  sitemapUsersURL: string,
  sitemapQFRoundsURL: string,
) => {
  const sitemapRepo = AppDataSource.getDataSource().getRepository(SitemapUrl);

  try {
    // Fetch the last entry
    const lastEntry = await sitemapRepo
      .createQueryBuilder('sitemap_url')
      .orderBy('sitemap_url.created_at', 'DESC')
      .getOne();

    // Delete old Pinata files before updating
    if (lastEntry) {
      await deleteOldPinataFiles(lastEntry.sitemap_urls);
    }

    // Create or update the latest entry
    const newEntry = lastEntry ? lastEntry : new SitemapUrl();
    newEntry.sitemap_urls = {
      sitemapProjectsURL,
      sitemapUsersURL,
      sitemapQFRoundsURL,
    };
    newEntry.created_at = new Date();

    await sitemapRepo.save(newEntry);
  } catch (error) {
    logger.error('Error updating sitemap in DB:', error.message);
  }
};

/**
 * Delete old Pinata files before saving new entries
 */
const deleteOldPinataFiles = async (sitemapUrls: any) => {
  try {
    const pinata = getPinata();

    const oldUrls = [
      sitemapUrls.sitemapProjectsURL,
      sitemapUrls.sitemapUsersURL,
      sitemapUrls.sitemapQFRoundsURL,
    ];

    for (const url of oldUrls) {
      if (!url) continue;

      const ipfsHash = url.split('/').pop();
      if (ipfsHash) {
        await pinata.unpin(ipfsHash);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up old Pinata files:', error);
  }
};
