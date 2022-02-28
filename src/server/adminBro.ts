import { Project, ProjStatus } from '../entities/project';
import { ProjectStatus } from '../entities/projectStatus';
import AdminBro from 'admin-bro';
import { User, UserRole } from '../entities/user';
import AdminBroExpress from '@admin-bro/express';
import config from '../config';
import { dispatchProjectUpdateEvent } from '../services/trace/traceService';
import { Database, Resource } from '@admin-bro/typeorm';
import { SegmentEvents } from '../analytics/analytics';
import { logger } from '../utils/logger';
import { messages } from '../utils/messages';
import { Donation, DONATION_STATUS } from '../entities/donation';
import {
  findTransactionByHash,
  getCsvAirdropTransactions,
} from '../services/transactionService';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
} from '../types/TransactionInquiry';
import { errorMessages } from '../utils/errorMessages';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import {
  HISTORY_DESCRIPTIONS,
  ProjectStatusHistory,
} from '../entities/projectStatusHistory';

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
  payload?: any;
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
          Donation: {
            properties: {
              transactionNetworkId: 'Network',
              transactionId: 'txHash',
              disperseTxHash:
                'disperseTxHash, this is optional, just for disperse transactions',
            },
          },
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
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            nonce: {
              isVisible: false,
            },

            verifyErrorMessage: {
              isVisible: {
                list: false,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
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
              isVisible: {
                list: false,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            transakTransactionLink: {
              isVisible: false,
            },
            anonymous: {
              isVisible: false,
            },
            userId: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            tokenAddress: {
              isVisible: false,
            },
            fromWalletAddress: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            toWalletAddress: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            amount: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            priceEth: {
              isVisible: false,
            },
            valueEth: {
              isVisible: false,
            },
            valueUsd: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            status: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            createdAt: {
              isVisible: false,
            },
            transactionNetworkId: {
              availableValues: [
                { value: 1, label: 'Mainnet' },
                { value: 100, label: 'Xdai' },
                { value: 3, label: 'Ropsten' },
              ],
              isVisible: true,
            },
            txType: {
              availableValues: [
                { value: 'normalTransfer', label: 'normalTransfer' },
                { value: 'csvAirDrop', label: 'Using csv airdrop app' },
              ],
              isVisible: {
                list: false,
                show: false,
                new: true,
                edit: true,
              },
            },
            priceUsd: {
              isVisible: true,
              type: 'number',
            },
          },
          actions: {
            bulkDelete: {
              isVisible: false,
            },
            edit: {
              isVisible: false,
            },
            delete: {
              isVisible: false,
            },

            new: {
              handler: createDonation,
              // component: true,
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
            qualityScore: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            totalDonations: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            totalTraceDonations: {
              isVisible: { list: false, filter: false, show: true, edit: true },
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
            new: {
              isVisible: false,
            },
            bulkDelete: {
              isVisible: false,
            },
            edit: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
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
            rejectProject: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifyProjects(context, request, false);
              },
              component: false,
            },
            // the difference is that it sends another segment event
            revokeBadge: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifyProjects(context, request, false, true);
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
                  ProjStatus.cancelled,
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
            new: {
              isVisible: false,
            },
            edit: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            bulkDelete: {
              isVisible: false,
            },
          },
        },
      },
      {
        resource: ProjectStatusReason,
        options: {
          actions: {
            new: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            edit: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
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
        resource: ProjectStatusHistory,
        options: {
          actions: {
            delete: {
              isVisible: false,
            },
            edit: {
              isVisible: false,
            },
            new: {
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
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
              before: async request => {
                if (request.payload.password) {
                  const bc = await bcrypt.hash(
                    request.payload.password,
                    Number(process.env.BCRYPT_SALT),
                  );
                  request.payload = {
                    ...request.payload,
                    // For making an backoffice user admin, we should just use changing it directly in DB
                    encryptedPassword: bc,
                    password: null,
                  };
                }
                return request;
              },
            },
            edit: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
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

export const listDelist = async (
  context: AdminBroContextInterface,
  request,
  list = true,
) => {
  const { records, currentAdmin } = context;
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
      Project.addProjectStatusHistoryRecord({
        project,
        status: project.status,
        userId: currentAdmin.id,
        description: list
          ? HISTORY_DESCRIPTIONS.CHANGED_TO_LISTED
          : HISTORY_DESCRIPTIONS.CHANGED_TO_UNLISTED,
      });
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

export const verifyProjects = async (
  context: AdminBroContextInterface,
  request: AdminBroRequestInterface,
  verified: boolean = true,
  revokeBadge: boolean = false,
) => {
  const { records, currentAdmin } = context;
  // prioritize revokeBadge
  const verificationStatus = revokeBadge ? false : verified;
  try {
    const projects = await Project.createQueryBuilder('project')
      .update<Project>(Project, { verified: verificationStatus })
      .where('project.id IN (:...ids)')
      .setParameter('ids', request.query.recordIds.split(','))
      .returning('*')
      .updateEntity(true)
      .execute();

    let segmentEvent = verified
      ? SegmentEvents.PROJECT_VERIFIED
      : SegmentEvents.PROJECT_UNVERIFIED;

    segmentEvent = revokeBadge
      ? SegmentEvents.PROJECT_BADGE_REVOKED
      : segmentEvent;

    Project.sendBulkEventsToSegment(projects.raw, segmentEvent);
    projects.raw.forEach((project: Project) => {
      dispatchProjectUpdateEvent(project);
      Project.addProjectStatusHistoryRecord({
        project,
        status: project.status,
        userId: currentAdmin.id,
        description: verified
          ? HISTORY_DESCRIPTIONS.CHANGED_TO_VERIFIED
          : HISTORY_DESCRIPTIONS.CHANGED_TO_UNVERIFIED,
      });
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
        verificationStatus ? 'verified' : 'unverified'
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
  const { h, resource, records, currentAdmin } = context;
  try {
    const projectStatus = await ProjectStatus.findOne({ id: status });
    if (projectStatus) {
      const updateData: any = { status: projectStatus };
      if (status === ProjStatus.cancelled) {
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
        Project.addProjectStatusHistoryRecord({
          project,
          status: projectStatus,
          userId: currentAdmin.id,
        });
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

export const createDonation = async (
  request: AdminBroRequestInterface,
  response,
  context: AdminBroContextInterface,
) => {
  let message = messages.DONATION_CREATED_SUCCESSFULLY;

  let type = 'success';
  try {
    logger.debug('create donation ', request.payload);
    const {
      transactionNetworkId,
      transactionId: txHash,
      currency,
      priceUsd,
      txType,
      segmentNotified,
    } = request.payload;
    if (!priceUsd) {
      throw new Error('priceUsd is required');
    }
    const networkId = Number(transactionNetworkId);
    let transactions: NetworkTransactionInfo[] = [];
    if (txType === 'csvAirDrop') {
      // transactions = await getDisperseTransactions(txHash, networkId);
      transactions = await getCsvAirdropTransactions(txHash, networkId);
    } else {
      const txInfo = await findTransactionByHash({
        networkId,
        txHash,
        symbol: currency,
      } as TransactionDetailInput);
      if (!txInfo) {
        throw new Error(errorMessages.INVALID_TX_HASH);
      }
      transactions.push(txInfo);
    }

    for (const transactionInfo of transactions) {
      // const project = await Project.findOne({
      //   walletAddress: transactionInfo?.to,
      // });
      const project = await Project.createQueryBuilder('project')
        .where(`lower("walletAddress")=lower(:address)`, {
          address: transactionInfo?.to,
        })
        .getOne();

      if (!project) {
        logger.error(
          'Creating donation by admin bro, csv airdrop error ' +
            errorMessages.TO_ADDRESS_OF_DONATION_SHOULD_BE_PROJECT_WALLET_ADDRESS,
          {
            hash: txHash,
            toAddress: transactionInfo?.to,
            networkId,
          },
        );
        continue;
      }

      const donation = Donation.create({
        fromWalletAddress: transactionInfo?.from,
        toWalletAddress: transactionInfo?.to,
        transactionId: txHash,
        transactionNetworkId: networkId,
        project,
        priceUsd,
        currency,
        segmentNotified,
        amount: transactionInfo?.amount,
        valueUsd: (transactionInfo?.amount as number) * priceUsd,
        status: DONATION_STATUS.VERIFIED,
        donationType: 'csvAirDrop',
        createdAt: new Date(transactionInfo?.timestamp as number),
        anonymous: true,
      });
      const donor = await User.findOne({
        walletAddress: transactionInfo?.from,
      });
      if (donor) {
        donation.anonymous = false;
        donation.user = donor;
      }
      await donation.save();
      logger.debug('Donation has been created successfully', donation.id);
    }
  } catch (e) {
    message = e.message;
    type = 'danger';
    logger.error('create donation error', e.message);
  }

  response.send({
    redirectUrl: 'Donation',
    record: {},
    notice: {
      message,
      type,
    },
  });
};

export const adminBroRootPath = '/admin';
