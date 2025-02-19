/**
 * This cron job is responsible for generating sitemap on frontend.
 *
 * It sends a request to frontend to generate sitemap with all projects, users and qfRounds.
 *
 * It is scheduled to run every Sunday at 00:00.
 *
 * It use SITEMAP_CRON_SECRET that is set in .env file and MUST be the same on frontend!
 */
import { schedule } from 'node-cron';
import axios from 'axios';
import config from '../../config';
import { logger } from '../../utils/logger';
import { Project, ProjStatus } from '../../entities/project';
import { User } from '../../entities/user';
import { QfRound } from '../../entities/qfRound';

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
    logger.debug('FRONTEND_URL:', process.env.FRONTEND_URL);
    try {
      if (!FRONTEND_URL || FRONTEND_URL.trim() === '') {
        logger.error(
          'FRONTEND_URL is not defined in the environment variables',
        );
        return;
      }

      const projects = await fetchProjects();
      const users = await fetchUsers();
      const qfRounds = await fetchQFRounds();

      const frontendUrl = FRONTEND_URL.startsWith('http')
        ? FRONTEND_URL.trim()
        : `https://${FRONTEND_URL.trim()}`;

      logger.debug('FRONTEND_URL being used:', frontendUrl);

      const response = await axios.post(
        `${frontendUrl}/api/generate-sitemap`,
        {
          projects,
          users,
          qfRounds,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.SITEMAP_CRON_SECRET}`,
          },
        },
      );
      logger.info('runGenerateSitemapOnFrontend() response:', response.data);
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
