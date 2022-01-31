import { Project, ProjStatus } from '../entities/project';
import { ProjectStatus } from '../entities/projectStatus';
import AdminBro from 'admin-bro';
import { User } from '../entities/user';
import AdminBroExpress from '@admin-bro/express';
import config from '../config';
import { dispatchProjectUpdateEvent } from '../services/trace/traceService';
import { Database, Resource } from '@admin-bro/typeorm';
import { SegmentEvents } from '../analytics/analytics';
import { logger } from '../utils/logger';
import { messages } from '../utils/messages';
import { Donation } from '../entities/donation';

// tslint:disable-next-line:no-var-requires
const bcrypt = require('bcrypt');
const segmentProjectStatusEvents = {
  act: SegmentEvents.PROJECT_ACTIVATED,
  can: SegmentEvents.PROJECT_DEACTIVATED,
  del: SegmentEvents.PROJECT_CANCELLED,
};

interface AdminBroContextInterface {
  h: any;
  resource: any;
  records: any[];
  currentAdmin: User;
}
interface AdminBroRequestInterface {
  query: {
    recordIds: string;
  };
}

AdminBro.registerAdapter({ Database, Resource });

export const getAdminBroRouter = () => {
  return AdminBroExpress.buildAuthenticatedRouter(getAdminBroInstance(), {
    authenticate: async (email, password) => {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const matched = await bcrypt.compare(
            password,
            user.encryptedPassword,
          );
          if (matched) {
            return user;
          }
        }
        return false;
      } catch (e) {
        logger.error({ e });
        return false;
      }
    },
    cookiePassword: config.get('ADMIN_BRO_COOKIE_SECRET') as string,
  });
};

const getAdminBroInstance = () => {
  return new AdminBro({
    branding: {
      logo: 'https://i.imgur.com/cGKo1Tk.png',
      favicon:
        'https://icoholder.com/media/cache/ico_logo_view_page/files/img/e15c430125a607a604a3aee82e65a8f7.png',
      companyName: 'Giveth',
      softwareBrothers: false,
    },
    locale: {
      translations: {
        resources: {
          // Donation: {
          //   properties: {
          //     transactionNetworkId: 'Network',
          //     'transactionNetworkId.1': 'Mainnet',
          //     'transactionNetworkId.3': 'Ropsten',
          //     'transactionNetworkId.100': 'xDai',
          //   },
          // },
          Project: {
            properties: {
              listed: 'Listed',
              'listed.true': 'Listed',
              'listed.false': 'Unlisted',
              'listed.null': 'Not Reviewed',
              'listed.undefined': 'Not Reviewed',
            },
          },
        },
      },
      language: 'en',
    },
    resources: [
      {
        resource: Donation,
        options: {
          properties: {
            projectId: {
              isVisible: false,
            },
            nonce: {
              isVisible: false,
            },

            verifyErrorMessage: {
              isVisible: false,
            },
            speedup: {
              isVisible: false,
            },
            isFiat: {
              isVisible: false,
            },
            donationType: {
              isVisible: false,
            },
            transakStatus: {
              isVisible: false,
            },
            transakTransactionLink: {
              isVisible: false,
            },
            anonymous: {
              isVisible: false,
            },
            userId: {
              isVisible: false,
            },
            tokenAddress: {
              isVisible: false,
            },
          },
          actions: {
            bulkDelete: {
              isVisible: false,
            },

            new: {
              handler: async request => {
                let message = messages.DONATION_CREATED_SUCCESSFULLY;
                let type = 'success';
                try {
                  // Admin bro assume check method name be post, but when logging I noticed it is POST
                  request.method = 'post';
                  // logger.debug('create donation ', request);

                  // TODO Add createdAt, the time of donation, find userId manually
                  throw new Error('I should get price haahaaaa');

                  // tslint:disable-next-line:no-console
                } catch (e) {
                  message = e.message;
                  type = 'danger';
                  logger.error('create donation error', e.message);
                  throw e;
                }

                // return {
                //   notice: {
                //     message,
                //     type,
                //   },
                // };

                return {
                  redirectUrl: 'Donation',
                  records: [],
                  notice: {
                    message: `Project(s) successfully 'verified' : 'unverified'
                    }`,
                    type,
                  },
                };
              },
            },
          },
        },
      },
      {
        resource: Project,
        options: {
          properties: {
            id: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
              },
            },
            traceCampaignId: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
              },
            },
            admin: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            description: {
              isVisible: {
                list: false,
                filter: false,
                show: false,
                edit: true,
              },
            },
            slug: {
              isVisible: { list: false, filter: true, show: true, edit: true },
            },
            organisationId: {
              isVisible: false,
            },
            coOrdinates: {
              isVisible: false,
            },
            image: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            givingBlocksId: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            website: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            youtube: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            balance: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
              },
            },
            totalProjectUpdates: {
              isVisible: false,
            },
            giveBacks: {
              isVisible: false,
            },
            stripeAccountId: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
              },
            },
            totalReactions: {
              isVisible: false,
            },
            walletAddress: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            impactLocation: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            slugHistory: {
              isVisible: false,
            },
            listed: {
              isVisible: true,
              components: {
                filter: AdminBro.bundle('./components/FilterListedComponent'),
              },
            },
          },
          actions: {
            delete: {
              isVisible: false,
            },
            bulkDelete: {
              isVisible: false,
            },
            edit: {
              after: async request => {
                const project = await Project.findOne(request?.record?.id);
                if (project) {
                  await dispatchProjectUpdateEvent(project);
                }
                return request;
              },
            },
            listProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return listDelist(context, request, true);
              },
              component: false,
            },
            unlistProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return listDelist(context, request, false);
              },
              component: false,
            },
            verifyProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifyProjects(context, request, true);
              },
              component: false,
            },
            unverifyProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifyProjects(context, request, false);
              },
              component: false,
            },
            activateProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return updateStatusOfProjects(
                  context,
                  request,
                  ProjStatus.active,
                );
              },
              component: false,
            },
            deactivateProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return updateStatusOfProjects(
                  context,
                  request,
                  ProjStatus.deactive,
                );
              },
              component: false,
            },
            cancelProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return updateStatusOfProjects(
                  context,
                  request,
                  ProjStatus.cancel,
                );
              },
              component: false,
            },
          },
        },
      },
      {
        resource: ProjectStatus,
        options: {
          actions: {
            delete: {
              isVisible: false,
            },
            bulkDelete: {
              isVisible: false,
            },
          },
        },
      },
      {
        resource: User,
        options: {
          properties: {
            encryptedPassword: {
              isVisible: false,
            },
            avatar: {
              isVisible: false,
            },
            password: {
              type: 'string',
              isVisible: {
                list: false,
                edit: true,
                filter: false,
                show: false,
              },
              // isVisible: false,
            },
          },
          actions: {
            delete: {
              isVisible: false,
            },
            bulkDelete: {
              isVisible: false,
            },
            new: {
              before: async request => {
                if (request.payload.password) {
                  const bc = await bcrypt.hash(
                    request.payload.password,
                    Number(process.env.BCRYPT_SALT),
                  );
                  request.payload = {
                    ...request.payload,
                    encryptedPassword: bc,
                    password: null,
                  };
                }
                return request;
              },
            },
            edit: {
              before: async request => {
                logger.debug({ request: request.payload });
                if (request.payload.password) {
                  const bc = await bcrypt.hash(
                    request.payload.password,
                    Number(process.env.BCRYPT_SALT),
                  );
                  request.payload = {
                    ...request.payload,
                    encryptedPassword: bc,
                    password: null,
                  };
                }
                return request;
              },
            },
          },
        },
      },
    ],
    rootPath: adminBroRootPath,
  });
};

const listDelist = async (
  context: AdminBroContextInterface,
  request,
  list = true,
) => {
  const { records } = context;
  try {
    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, { listed: list })
      .where('project.id IN (:...ids)')
      .setParameter('ids', request.query.recordIds.split(','))
      .returning('*')
      .updateEntity(true)
      .execute();

    Project.sendBulkEventsToSegment(
      projects.raw,
      list ? SegmentEvents.PROJECT_LISTED : SegmentEvents.PROJECT_UNLISTED,
    );
    projects.raw.forEach(project => {
      dispatchProjectUpdateEvent(project);
    });
  } catch (error) {
    logger.error('listDelist error', error);
    throw error;
  }
  return {
    redirectUrl: 'Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: `Project(s) successfully ${list ? 'listed' : 'unlisted'}`,
      type: 'success',
    },
  };
};

const verifyProjects = async (
  context: AdminBroContextInterface,
  request: AdminBroRequestInterface,
  verified = true,
) => {
  const { records } = context;
  try {
    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, { verified })
      .where('project.id IN (:...ids)')
      .setParameter('ids', request.query.recordIds.split(','))
      .returning('*')
      .updateEntity(true)
      .execute();

    Project.sendBulkEventsToSegment(
      projects.raw,
      verified
        ? SegmentEvents.PROJECT_VERIFIED
        : SegmentEvents.PROJECT_UNVERIFIED,
    );
    projects.raw.forEach(project => {
      dispatchProjectUpdateEvent(project);
    });
  } catch (error) {
    logger.error('verifyProjects() error', error);
    throw error;
  }
  return {
    redirectUrl: 'Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: `Project(s) successfully ${
        verified ? 'verified' : 'unverified'
      }`,
      type: 'success',
    },
  };
};

export const updateStatusOfProjects = async (
  context: AdminBroContextInterface,
  request: AdminBroRequestInterface,
  status,
) => {
  const { h, resource, records } = context;
  try {
    const projectStatus = await ProjectStatus.findOne({ id: status });
    if (projectStatus) {
      const updateData: any = { status: projectStatus };
      if (status === ProjStatus.cancel) {
        updateData.verified = false;
        updateData.listed = false;
      }
      const projects = await Project.createQueryBuilder('project')
        .update<Project>(Project, updateData)
        .where('project.id IN (:...ids)')
        .setParameter('ids', request.query.recordIds.split(','))
        .returning('*')
        .updateEntity(true)
        .execute();

      Project.sendBulkEventsToSegment(
        projects.raw,
        segmentProjectStatusEvents[projectStatus.symbol],
      );
      projects.raw.forEach(project => {
        dispatchProjectUpdateEvent(project);
      });
    }
  } catch (error) {
    throw error;
  }
  return {
    redirectUrl: 'Project',
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: messages.PROJECT_STATUS_UPDATED_SUCCESSFULLY,
      type: 'success',
    },
  };
};

export const adminBroRootPath = '/admin';
