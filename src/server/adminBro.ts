import { Category, Project, ProjStatus } from '../entities/project';
import { ThirdPartyProjectImport } from '../entities/thirdPartyProjectImport';
import { ProjectStatus } from '../entities/projectStatus';
import AdminBro, { ActionResponse, After } from 'admin-bro';
import { User, UserRole } from '../entities/user';
import AdminBroExpress from '@admin-bro/express';
import config from '../config';
import { redis } from '../redis';
import { dispatchProjectUpdateEvent } from '../services/trace/traceService';
import { Database, Resource } from '@admin-bro/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { SegmentEvents } from '../analytics/analytics';
import { logger } from '../utils/logger';
import { messages } from '../utils/messages';
import {
  Donation,
  DONATION_STATUS,
  DONATION_TYPES,
} from '../entities/donation';
import {
  findTransactionByHash,
  getCsvAirdropTransactions,
  getGnosisSafeTransactions,
} from '../services/transactionService';
import {
  projectExportSpreadsheet,
  addSheetWithRows,
} from '../services/googleSheets';
import {
  createProjectFromChangeNonProfit,
  getChangeNonProfitByNameOrIEN,
} from '../services/changeAPI/nonProfits';
import {
  NetworkTransactionInfo,
  TransactionDetailInput,
} from '../types/TransactionInquiry';
import { errorMessages } from '../utils/errorMessages';
import { ProjectStatusReason } from '../entities/projectStatusReason';
import { IncomingMessage } from 'connect';
import {
  HISTORY_DESCRIPTIONS,
  ProjectStatusHistory,
} from '../entities/projectStatusHistory';
import { Organization, ORGANIZATION_LABELS } from '../entities/organization';
import { Token } from '../entities/token';
import { NETWORK_IDS } from '../provider';
import { ProjectAddress } from '../entities/projectAddress';
import {
  findAdminUserByEmail,
  findUserById,
  findUserByWalletAddress,
} from '../repositories/userRepository';
import {
  FormRelatedAddress,
  ProjectVerificationForm,
  PROJECT_VERIFICATION_STATUSES,
} from '../entities/projectVerificationForm';
import {
  findProjectVerificationFormById,
  makeFormDraft,
  verifyForm,
  verifyMultipleForms,
} from '../repositories/projectVerificationRepository';
import {
  findProjectById,
  updateProjectWithVerificationForm,
  verifyMultipleProjects,
  verifyProject,
} from '../repositories/projectRepository';
import { SocialProfile } from '../entities/socialProfile';
import { RecordJSON } from 'admin-bro/src/frontend/interfaces/record-json.interface';
import { findSocialProfilesByProjectId } from '../repositories/socialProfileRepository';
import { updateTotalDonationsOfProject } from '../services/donationService';
import { updateUserTotalDonated } from '../services/userService';
import { MainCategory } from '../entities/mainCategory';
import { getNotificationAdapter } from '../adapters/adaptersFactory';

// use redis for session data instead of in-memory storage
// tslint:disable-next-line:no-var-requires
const bcrypt = require('bcrypt');
// tslint:disable-next-line:no-var-requires
const session = require('express-session');
// tslint:disable-next-line:no-var-requires
const RedisStore = require('connect-redis')(session);
// tslint:disable-next-line:no-var-requires
const cookie = require('cookie');
// tslint:disable-next-line:no-var-requires
const cookieParser = require('cookie-parser');
const secret = config.get('ADMIN_BRO_COOKIE_SECRET') as string;
const adminBroCookie = 'adminbro';

const segmentProjectStatusEvents = {
  activate: SegmentEvents.PROJECT_ACTIVATED,
  deactivate: SegmentEvents.PROJECT_DEACTIVATED,
  cancelled: SegmentEvents.PROJECT_CANCELLED,
};

// headers defined by the verification team for exporting
const headers = [
  'id',
  'title',
  'slug',
  'admin',
  'creationDate',
  'updatedAt',
  'impactLocation',
  'walletAddress',
  'statusId',
  'qualityScore',
  'verified',
  'listed',
  'totalDonations',
  'totalProjectUpdates',
  'website',
];

interface AdminBroContextInterface {
  h: any;
  resource: any;
  records: any[];
  currentAdmin: User;
  payload?: any;
}

interface AdminBroRequestInterface {
  payload?: any;
  record?: any;
  query?: {
    recordIds?: string;
  };
  params?: {
    recordId?: string;
  };
}

AdminBro.registerAdapter({ Database, Resource });

export const getAdminBroRouter = async () => {
  return AdminBroExpress.buildAuthenticatedRouter(
    await getAdminBroInstance(),
    {
      authenticate: async (email, password) => {
        try {
          const user = await findAdminUserByEmail(email);
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
      cookiePassword: secret,
    },
    // custom router to save admin in req.session for express middlewares
    null,
    {
      // default values that will be deprecated, need to define them manually
      resave: false,
      saveUninitialized: true,
      rolling: false,
      secret,
      store: new RedisStore({
        client: redis,
      }),
    },
  );
};

// Express Middleware to save query of a search
export const adminBroQueryCache = async (req, res, next) => {
  if (
    req.url.startsWith('/admin/api/resources/Project/actions/list') &&
    req.headers.cookie.includes('adminbro')
  ) {
    const admin = await getCurrentAdminBroSession(req);
    if (!admin) return next(); // skip saving queries

    const queryStrings = {};
    // get URL query strings
    for (const key of Object.keys(req.query)) {
      const [_, filter] = key.split('.');
      if (!filter) continue;

      queryStrings[filter] = req.query[key];
    }
    // save query string for later use with an expiration
    await redis.set(
      `adminbro_${admin.id}_qs`,
      JSON.stringify(queryStrings),
      'ex',
      1800,
    );
  }
  next();
};

export const setSocialProfiles: After<ActionResponse> = async (
  response,
  request,
  context,
) => {
  const record: RecordJSON = response.record || {};
  // both cases for projectVerificationForms and projects' ids
  const projectId = record.params.projectId || record.params.id;

  const socials = await findSocialProfilesByProjectId({ projectId });
  response.record = {
    ...record,
    params: {
      ...record.params,
      socials,
    },
  };
  return response;
};

export const setCommentEmailAndTimeStamps: After<ActionResponse> = async (
  response,
  request,
  context,
) => {
  const { currentAdmin } = context;
  const record: RecordJSON = response.record || {};

  const projectVerificationForm =
    await ProjectVerificationForm.createQueryBuilder()
      .where('id = :id', { id: record.params.id })
      .getOne();

  if (!projectVerificationForm) return response;

  // if none is created, nothing will be updated
  if (projectVerificationForm?.commentsSection?.comments) {
    for (const comment of projectVerificationForm.commentsSection.comments) {
      if (comment.email) continue;
      comment.email = currentAdmin!.email;
      comment.createdAt = new Date();
    }
  }

  await projectVerificationForm.save();
  return response;
};

// Get CurrentSession for external express middlewares
export const getCurrentAdminBroSession = async (request: IncomingMessage) => {
  const cookieHeader = request.headers.cookie;
  const parsedCookies = cookie.parse(cookieHeader);
  const sessionStore = new RedisStore({ client: redis });
  const unsignedCookie = cookieParser.signedCookie(
    parsedCookies[adminBroCookie],
    secret,
  );

  let adminUser;
  try {
    adminUser = await new Promise((success, failure) => {
      sessionStore.get(unsignedCookie, (err, sessionObject) => {
        if (err) {
          failure(err);
        } else {
          success(sessionObject.adminUser);
        }
      });
    });
  } catch (e) {
    logger.error(e);
  }
  if (!adminUser) return false;

  const dbUser = await findUserById(adminUser.id);
  if (!dbUser) return false;

  return dbUser;
};

const getAdminBroInstance = async () => {
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
        resource: ProjectVerificationForm,
        options: {
          sort: {
            direction: 'desc',
            sortBy: 'updatedAt',
          },
          filter: {},
          properties: {
            id: {
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
                edit: true,
                new: true,
              },
            },
            lastStep: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            projectId: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            reviewerId: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
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
            createdAt: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            updatedAt: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            email: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            socials: {
              type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
              components: {
                show: AdminBro.bundle('./components/VerificationFormSocials'),
              },
            },
            personalInfo: {
              type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            'personalInfo.fullName': { type: 'string' },
            'personalInfo.walletAddress': { type: 'string' },
            'personalInfo.email': { type: 'string' },
            projectRegistry: {
              type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
              components: {
                show: AdminBro.bundle(
                  './components/VerificationFormProjectRegistry',
                ),
              },
            },
            projectContacts: {
              type: 'mixed',
              isArray: true,
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            'projectContacts.name': { type: 'string' },
            'projectContacts.url': { type: 'string' },
            milestones: {
              // type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
              components: {
                show: AdminBro.bundle(
                  './components/VerificationFormMilestones',
                ),
              },
            },
            managingFunds: {
              type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            'managingFunds.description': { type: 'string' },
            'managingFunds.relatedAddresses': { type: 'mixed', isArray: true },
            'managingFunds.relatedAddresses.title': { type: 'string' },
            'managingFunds.relatedAddresses.address': { type: 'string' },
            'managingFunds.relatedAddresses.networkId': { type: 'integer' },
            commentsSection: {
              type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: true,
                new: true,
              },
            },
            'commentsSection.comments': { type: 'mixed', isArray: true },
            'commentsSection.comments.email': {
              type: 'string',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: true,
              },
            },
            'commentsSection.comments.content': {
              type: 'string',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: true,
                new: true,
              },
            },
            'commentsSection.comments.createdAt': {
              type: 'date',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            emailConfirmed: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
            emailConfirmationTokenExpiredAt: {
              isVisible: false,
            },
            emailConfirmationToken: {
              isVisible: false,
            },
            emailConfirmationSent: {
              isVisible: false,
            },
            emailConfirmationSentAt: {
              isVisible: false,
            },
            emailConfirmedAt: {
              isVisible: false,
            },
            isTermAndConditionsAccepted: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
            },
          },
          actions: {
            bulkDelete: {
              isVisible: false,
            },
            edit: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin &&
                (currentAdmin.role === UserRole.ADMIN ||
                  currentAdmin.role === UserRole.VERIFICATION_FORM_REVIEWER),
              isVisible: true,
              after: setCommentEmailAndTimeStamps,
            },
            show: {
              isVisible: true,
              after: setSocialProfiles,
            },
            delete: {
              isVisible: false,
            },
            new: {
              isVisible: false,
            },
            verifyProject: {
              actionType: 'record',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifySingleVerificationForm(context, request, true);
              },
              component: false,
            },
            makeEditableByUser: {
              actionType: 'record',
              isVisible: true,
              handler: async (request, response, context) => {
                return makeEditableByUser(context, request);
              },
              component: false,
            },
            rejectProject: {
              actionType: 'record',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifySingleVerificationForm(context, request, false);
              },
              component: false,
            },
            verifyProjects: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifyVerificationForms(context, request, true);
              },
              component: false,
            },
            rejectProjects: {
              actionType: 'bulk',
              isVisible: true,
              handler: async (request, response, context) => {
                return verifyVerificationForms(context, request, false);
              },
              component: false,
            },
          },
        },
      },
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
            isTokenEligibleForGivback: {
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
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            currency: {
              isVisible: true,
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
                { value: 'gnosisSafe', label: 'Using gnosis safe multi sig' },
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
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
              // component: true,
            },
          },
        },
      },
      {
        resource: Token,
        options: {
          properties: {
            networkId: {
              isVisible: true,
              availableValues: [
                { value: NETWORK_IDS.MAIN_NET, label: 'MAINNET' },
                { value: NETWORK_IDS.ROPSTEN, label: 'ROPSTEN' },
                { value: NETWORK_IDS.XDAI, label: 'XDAI' },
                { value: NETWORK_IDS.BSC, label: 'BSC' },
              ],
            },
            symbol: { isVisible: true },
            name: { isVisible: true },
            isGivbackEligible: { isVisible: true },
            address: { isVisible: true },
            mainnetAddress: {
              isVisible: {
                show: true,
                edit: true,
                new: true,
                list: false,
                filter: true,
              },
            },
            decimals: { isVisible: true },
            organizations: {
              isVisible: {
                show: true,
                edit: true,
                new: true,
                list: true,
              },
              components: {
                show: AdminBro.bundle('./components/ListOrganizationsNames'),
                list: AdminBro.bundle('./components/ListOrganizationsNames'),
              },
              availableValues: await generateOrganizationList(),
            },
          },
          actions: {
            bulkDelete: {
              isVisible: false,
            },
            // Organization is not editable, hooks are not working correctly
            edit: {
              after: linkOrganizations,
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
              isVisible: true,
              // component: false
            },
            delete: {
              isVisible: false,
            },
            new: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
              handler: createToken,
              // component: false
            },
          },
        },
      },
      {
        resource: ThirdPartyProjectImport,
        options: {
          properties: {
            thirdPartyAPI: {
              availableValues: [{ value: 'Change', label: 'Change API' }],
              isVisible: true,
            },
            projectName: {
              isVisible: { show: false, edit: true, new: true, list: false },
            },
            userId: {
              isVisible: { show: true, edit: false, new: false, list: true },
            },
            projectId: {
              isVisible: { show: true, edit: false, new: false, list: true },
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
              handler: importThirdPartyProject,
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
            changeId: {
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
              },
            },
            organizationId: {
              isVisible: { list: false, filter: false, show: true, edit: true },
            },
            socials: {
              type: 'mixed',
              isVisible: {
                list: false,
                filter: false,
                show: true,
                edit: false,
                new: false,
              },
              components: {
                show: AdminBro.bundle('./components/VerificationFormSocials'),
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
                show: true,
                edit: true,
              },
            },
            slug: {
              isVisible: { list: true, filter: true, show: true, edit: true },
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
            isImported: {
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
              isVisible: { list: false, filter: true, show: true, edit: true },
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
            show: {
              isVisible: true,
              after: setSocialProfiles,
            },
            edit: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
              after: async (
                request: AdminBroRequestInterface,
                response,
                context: AdminBroContextInterface,
              ) => {
                const { currentAdmin } = context;
                const project = await Project.findOne(request?.record?.id);
                if (project) {
                  // Not required for now
                  // Project.notifySegment(project, SegmentEvents.PROJECT_EDITED);
                  await dispatchProjectUpdateEvent(project);

                  // As we dont what fields has changed (listed, verified, ..), I just added new status and a description that project has been edited
                  await Project.addProjectStatusHistoryRecord({
                    project,
                    status: project.status,
                    userId: currentAdmin.id,
                    description: HISTORY_DESCRIPTIONS.HAS_BEEN_EDITED,
                  });
                }

                return request;
              },
            },
            exportFilterToCsv: {
              actionType: 'resource',
              isVisible: true,
              handler: exportProjectsWithFiltersToCsv,
              component: false,
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
        resource: ProjectAddress,
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
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            bulkDelete: {
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
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
      {
        resource: Organization,
        options: {
          actions: {
            delete: {
              isVisible: false,
            },
            new: {
              isVisible: false,
            },
            edit: {
              isVisible: false,
            },
            bulkDelete: {
              isVisible: false,
            },
          },
        },
      },
      {
        resource: Category,
        options: {
          actions: {
            delete: {
              isVisible: false,
            },
            new: {
              isVisible: true,
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            edit: {
              isVisible: true,
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            bulkDelete: {
              isVisible: false,
            },
          },
          properties: {
            id: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            name: {
              isVisible: true,
            },
            isActive: {
              isVisible: true,
            },
            value: {
              isVisible: true,
            },
            mainCategory: {
              isVisible: true,
            },
          },
        },
      },
      {
        resource: MainCategory,
        options: {
          actions: {
            delete: {
              isVisible: false,
            },
            new: {
              isVisible: true,
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            edit: {
              isVisible: true,
              isAccessible: ({ currentAdmin }) =>
                currentAdmin && currentAdmin.role === UserRole.ADMIN,
            },
            bulkDelete: {
              isVisible: false,
            },
          },
          properties: {
            id: {
              isVisible: {
                list: true,
                filter: true,
                show: true,
                edit: false,
                new: false,
              },
            },
            banner: {
              isVisible: true,
            },
            slug: {
              isVisible: true,
            },
            title: {
              isVisible: true,
            },
            description: {
              isVisible: true,
            },
          },
        },
      },
    ],
    rootPath: adminBroRootPath,
  });
};

interface AdminBroProjectsQuery {
  statusId?: string;
  title?: string;
  slug?: string;
  verified?: string;
  listed?: string;
}

// add queries depending on which filters were selected
export const buildProjectsQuery = (
  queryStrings: AdminBroProjectsQuery,
): SelectQueryBuilder<Project> => {
  const query = Project.createQueryBuilder('project');

  if (queryStrings.title)
    query.andWhere('project.title ILIKE :title', {
      title: `%${queryStrings.title}%`,
    });

  if (queryStrings.slug)
    query.andWhere('project.slug ILIKE :slug', { title: queryStrings.slug });

  if (queryStrings.verified)
    query.andWhere('project.verified = :verified', {
      verified: queryStrings.verified === 'true',
    });

  if (queryStrings.listed)
    query.andWhere('project.listed = :listed', {
      listed: queryStrings.listed === 'true',
    });

  if (queryStrings.statusId)
    query.andWhere('project."statusId" = :statusId', {
      statusId: queryStrings.statusId,
    });

  if (queryStrings['creationDate~~from'])
    query.andWhere('project."creationDate" >= :createdFrom', {
      createdFrom: queryStrings['creationDate~~from'],
    });

  if (queryStrings['creationDate~~to'])
    query.andWhere('project."creationDate" <= :createdTo', {
      createdTo: queryStrings['creationDate~~to'],
    });

  if (queryStrings['updatedAt~~from'])
    query.andWhere('project."updatedAt" >= :updatedFrom', {
      updatedFrom: queryStrings['updatedAt~~from'],
    });

  if (queryStrings['updatedAt~~to'])
    query.andWhere('project."updatedAt" <= :updatedTo', {
      updatedTo: queryStrings['updatedAt~~to'],
    });

  return query;
};

export const permuteOrganizations = (
  organizationsLabels: string[],
  organizationCount: number,
) => {
  let allPermutations: string[] = [];

  // we exclude from here the AllOrganizationsOption and length 1 selection
  for (
    let permutationLength = 2;
    permutationLength < organizationCount;
    permutationLength++
  ) {
    const permutations = permute(organizationsLabels, permutationLength);
    for (const permutation of permutations) {
      allPermutations = allPermutations.concat(permutation.join(','));
    }
  }

  return allPermutations
    .sort((a, b) => a.length - b.length)
    .map(labels => {
      return { value: labels, label: labels };
    });
};

// generates orderly permutations and maps then into an array which is later flatten into 1 dimension
// Current length is the length of selected items from the total items
export const permute = (organizationsLabels: string[], currentLength) => {
  return organizationsLabels.flatMap((value, index) =>
    currentLength > 1
      ? permute(organizationsLabels.slice(index + 1), currentLength - 1).map(
          permutation => [value, ...permutation],
        )
      : [[value]],
  );
};

export const generateOrganizationList = async () => {
  const organizationsList: {}[] = [];
  const [organizations, organizationCount] =
    await Organization.createQueryBuilder('organization')
      .orderBy('organization.id')
      .getManyAndCount();
  const organizationLabels = organizations.map(org => org.label);

  // all organization labels into 1 option
  const allOrganizations = {
    value: organizationLabels.join(','),
    label: 'All Organizations',
  };

  // all four organizations separated
  const individualOrganizations = organizations.map(org => {
    return { value: org.label, label: org.label };
  });

  const organizationsPermutations = permuteOrganizations(
    organizationLabels,
    organizationCount,
  );

  return organizationsList.concat(
    allOrganizations,
    individualOrganizations,
    organizationsPermutations,
  );
};

export const exportProjectsWithFiltersToCsv = async (
  _request: AdminBroRequestInterface,
  _response,
  context: AdminBroContextInterface,
) => {
  try {
    const { records } = context;
    const rawQueryStrings = await redis.get(
      `adminbro_${context.currentAdmin.id}_qs`,
    );
    const queryStrings = rawQueryStrings ? JSON.parse(rawQueryStrings) : {};
    const projectsQuery = buildProjectsQuery(queryStrings);
    const projects = await projectsQuery.getMany();

    await sendProjectsToGoogleSheet(projects);

    return {
      redirectUrl: 'Project',
      records,
      notice: {
        message: `Project(s) successfully exported`,
        type: 'success',
      },
    };
  } catch (e) {
    return {
      redirectUrl: 'Project',
      record: {},
      notice: {
        message: e.message,
        type: 'danger',
      },
    };
  }
};

const sendProjectsToGoogleSheet = async (
  projects: Project[],
): Promise<void> => {
  const spreadsheet = await projectExportSpreadsheet();

  // parse data and set headers
  const projectRows = projects.map((project: Project) => {
    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      admin: project.admin,
      creationDate: project.creationDate,
      updatedAt: project.updatedAt,
      impactLocation: project.impactLocation || '',
      walletAddress: project.walletAddress,
      statusId: project.statusId,
      qualityScore: project.qualityScore,
      verified: Boolean(project.verified),
      listed: Boolean(project.listed),
      totalDonations: project.totalDonations,
      totalProjectUpdates: project.totalProjectUpdates,
      website: project.website || '',
    };
  });

  await addSheetWithRows(spreadsheet, headers, projectRows);
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
    for (const project of projects.raw) {
      await dispatchProjectUpdateEvent(project);
      await Project.addProjectStatusHistoryRecord({
        project,
        status: project.status,
        userId: currentAdmin.id,
        description: list
          ? HISTORY_DESCRIPTIONS.CHANGED_TO_LISTED
          : HISTORY_DESCRIPTIONS.CHANGED_TO_UNLISTED,
      });
      const projectWithAdmin = (await findProjectById(project.id)) as Project;
      if (list) {
        await getNotificationAdapter().projectListed({
          project: projectWithAdmin,
        });
      } else {
        await getNotificationAdapter().projectDeListed({
          project: projectWithAdmin,
        });
      }
    }
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

export const verifySingleVerificationForm = async (
  context: AdminBroContextInterface,
  request: AdminBroRequestInterface,
  verified: boolean,
) => {
  const { records, currentAdmin } = context;
  let responseMessage = '';
  let responseType = 'success';
  const verificationStatus = verified
    ? PROJECT_VERIFICATION_STATUSES.VERIFIED
    : PROJECT_VERIFICATION_STATUSES.REJECTED;
  const formId = Number(request?.params?.recordId);
  const verificationFormInDb = await findProjectVerificationFormById(formId);

  try {
    if (
      verified &&
      ![
        PROJECT_VERIFICATION_STATUSES.REJECTED,
        PROJECT_VERIFICATION_STATUSES.SUBMITTED,
      ].includes(verificationFormInDb?.status as PROJECT_VERIFICATION_STATUSES)
    ) {
      throw new Error(
        errorMessages.YOU_JUST_CAN_VERIFY_REJECTED_AND_SUBMITTED_FORMS,
      );
    }
    if (
      !verified &&
      PROJECT_VERIFICATION_STATUSES.SUBMITTED !== verificationFormInDb?.status
    ) {
      throw new Error(errorMessages.YOU_JUST_CAN_REJECT_SUBMITTED_FORMS);
    }
    // call repositories
    const segmentEvent = verified
      ? SegmentEvents.PROJECT_VERIFIED
      : SegmentEvents.PROJECT_REJECTED;

    const verificationForm = await verifyForm({
      verificationStatus,
      formId,
      adminId: currentAdmin.id,
    });
    const projectId = verificationForm.projectId;
    let project = (await findProjectById(projectId)) as Project;
    if (verified) {
      project = await verifyProject({ verified, projectId });
      await updateProjectWithVerificationForm(verificationForm, project);
    }
    Project.notifySegment(project, segmentEvent);
    if (verified) {
      await getNotificationAdapter().projectVerified({
        project,
      });
    } else {
      await getNotificationAdapter().projectUnVerified({
        project,
      });
    }

    responseMessage = `Project(s) successfully ${
      verified ? 'verified' : 'rejected'
    }`;
  } catch (error) {
    logger.error('verifyVerificationForm() error', error);
    responseType = 'danger';
    responseMessage = 'Verify/Reject verification form failed ' + error.message;
  }
  const x: RecordJSON = {
    id: String(formId),
    title: '',
    bulkActions: [],
    errors: {},
    params: (context as any).record.params,
    populated: (context as any).record.populated,
    recordActions: [],
  };

  return {
    record: x,
    redirectUrl: `/admin/resources/ProjectVerificationForm/ProjectVerificationForm/records`,
    notice: {
      message: responseMessage,
      type: responseType,
    },
  };
};

export const makeEditableByUser = async (
  context: AdminBroContextInterface,
  request: AdminBroRequestInterface,
) => {
  const { records, currentAdmin } = context;
  let responseMessage = '';
  let responseType = 'success';
  const formId = Number(request?.params?.recordId);
  const verificationFormInDb = await findProjectVerificationFormById(formId);

  try {
    if (
      ![
        PROJECT_VERIFICATION_STATUSES.REJECTED,
        PROJECT_VERIFICATION_STATUSES.SUBMITTED,
      ].includes(verificationFormInDb?.status as PROJECT_VERIFICATION_STATUSES)
    ) {
      throw new Error(
        errorMessages.YOU_JUST_CAN_MAKE_DRAFT_REJECTED_AND_SUBMITTED_FORMS,
      );
    }

    const segmentEvent = SegmentEvents.VERIFICATION_FORM_GOT_DRAFT_BY_ADMIN;

    const verificationForm = await makeFormDraft({
      formId,
      adminId: currentAdmin.id,
    });
    const projectId = verificationForm.projectId;
    const project = (await findProjectById(projectId)) as Project;
    Project.notifySegment(project, segmentEvent);

    responseMessage = `Project(s) successfully got draft`;
  } catch (error) {
    logger.error('verifyVerificationForm() error', error);
    responseType = 'danger';
    responseMessage = 'Verify/Reject verification form failed ' + error.message;
  }
  const x: RecordJSON = {
    id: String(formId),
    title: '',
    bulkActions: [],
    errors: {},
    params: (context as any).record.params,
    populated: (context as any).record.populated,
    recordActions: [],
  };

  return {
    record: x,
    redirectUrl: `/admin/resources/ProjectVerificationForm/ProjectVerificationForm/records`,
    notice: {
      message: responseMessage,
      type: responseType,
    },
  };
};

export const verifyVerificationForms = async (
  context: AdminBroContextInterface,
  request: AdminBroRequestInterface,
  verified: boolean,
) => {
  const { records, currentAdmin } = context;
  let responseMessage = '';
  let responseType = 'success';
  try {
    const verificationStatus = verified
      ? PROJECT_VERIFICATION_STATUSES.VERIFIED
      : PROJECT_VERIFICATION_STATUSES.REJECTED;
    const formIds = request?.query?.recordIds?.split(',');
    // call repositories
    const projectsForms = await verifyMultipleForms({
      verificationStatus,
      formIds,
    });
    const projectsIds = projectsForms.raw.map(projectForm => {
      return projectForm.projectId;
    });
    const projects = await verifyMultipleProjects({ verified, projectsIds });

    const segmentEvent = verified
      ? SegmentEvents.PROJECT_VERIFIED
      : SegmentEvents.PROJECT_REJECTED;

    Project.sendBulkEventsToSegment(projects.raw, segmentEvent);
    const projectIds = projects.raw.map(project => {
      return project.id;
    });

    // need to requery them as the RAW is not an entity
    const verificationForms = await ProjectVerificationForm.createQueryBuilder(
      'projectVerificationForm',
    )
      .innerJoinAndSelect('projectVerificationForm.project', 'project')
      .where('"projectId" IN (:...ids)')
      .setParameter('ids', projectIds)
      .getMany();

    for (const verificationForm of verificationForms) {
      await updateProjectWithVerificationForm(
        verificationForm,
        verificationForm.project,
      );
    }
    responseMessage = `Project(s) successfully ${
      verified ? 'verified' : 'rejected'
    }`;
  } catch (error) {
    logger.error('verifyVerificationForm() error', error);
    responseMessage = `Bulk verify failed ${error.message}`;
    responseType = 'danger';
  }
  return {
    redirectUrl: 'ProjectVerificationForm',
    // record: {},
    records: records.map(record => {
      record.toJSON(context.currentAdmin);
    }),
    notice: {
      message: responseMessage,
      type: responseType,
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
      .setParameter('ids', request?.query?.recordIds?.split(','))
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
      if (verified) {
        getNotificationAdapter().projectVerified({
          project,
        });
      } else {
        getNotificationAdapter().projectUnVerified({
          project,
        });
      }
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
        .setParameter('ids', request?.query?.recordIds?.split(','))
        .returning('*')
        .updateEntity(true)
        .execute();

      Project.sendBulkEventsToSegment(
        projects.raw,
        segmentProjectStatusEvents[projectStatus.symbol],
      );
      for (const project of projects.raw) {
        await dispatchProjectUpdateEvent(project);
        await Project.addProjectStatusHistoryRecord({
          project,
          status: projectStatus,
          userId: currentAdmin.id,
        });
        const projectWithAdmin = (await findProjectById(project.id)) as Project;
        if (status === ProjStatus.cancelled) {
          await getNotificationAdapter().projectCancelled({
            project: projectWithAdmin,
          });
        } else if (status === ProjStatus.active) {
          await getNotificationAdapter().projectReactivated({
            project: projectWithAdmin,
          });
        } else if (status === ProjStatus.deactive) {
          await getNotificationAdapter().projectDeactivated({
            project: projectWithAdmin,
          });
        }
      }
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

export const linkOrganizations = async (request: AdminBroRequestInterface) => {
  // edit action calls this method more than once, returning from those extra calls
  // default handler updates the other params, we only care about orgs
  if (!request.record.params.organizations) return request;

  let message = `Token created successfully`;
  let type = 'success';
  const { organizations, id } = request.record.params;
  try {
    const token = await Token.createQueryBuilder('token')
      .where('token.id = :id', { id })
      .getOne();

    if (organizations) {
      // delete organization relation and relink them
      await Token.query(`
        DELETE FROM organization_tokens_token
        WHERE "tokenId" = ${token!.id}
      `);

      const organizationsInDb = await Organization.createQueryBuilder(
        'organization',
      )
        .where('organization.label IN (:...labels)', {
          labels: organizations.split(','),
        })
        .getMany();

      token!.organizations = organizationsInDb;
    }

    await token!.save();
  } catch (e) {
    logger.error('error creating token', e.message);
    message = e.message;
    type = 'danger';
  }

  return request;
};

export const createToken = async (
  request: AdminBroRequestInterface,
  response,
) => {
  let message = `Token created successfully`;
  let type = 'success';
  const {
    address,
    decimals,
    isGivbackEligible,
    mainnetAddress,
    name,
    networkId,
    symbol,
    organizations,
  } = request.payload;
  try {
    const newToken = Token.create({
      name,
      symbol,
      address: address?.toLowerCase(),
      mainnetAddress: mainnetAddress?.toLowerCase(),
      isGivbackEligible,
      decimals: Number(decimals),
      networkId: Number(networkId),
    });

    if (organizations) {
      const organizationsInDb = await Organization.createQueryBuilder(
        'organization',
      )
        .where('organization.label IN (:...labels)', {
          labels: organizations.split(','),
        })
        .getMany();

      newToken.organizations = organizationsInDb;
    }

    await newToken.save();
  } catch (e) {
    logger.error('error creating token', e.message);
    message = e.message;
    type = 'danger';
  }

  response.send({
    redirectUrl: 'Token',
    record: {},
    notice: {
      message,
      type,
    },
  });
};

export const importThirdPartyProject = async (
  request: AdminBroRequestInterface,
  response,
  context,
) => {
  const { currentAdmin } = context;
  let message = `Project successfully imported`;
  let type = 'success';

  try {
    logger.debug('import third party project', request.payload);
    let nonProfit;
    let newProject;
    const { thirdPartyAPI, projectName } = request.payload;
    switch (thirdPartyAPI) {
      case 'Change': {
        nonProfit = await getChangeNonProfitByNameOrIEN(projectName);
        newProject = await createProjectFromChangeNonProfit(nonProfit);
        break;
      }
      default: {
        throw errorMessages.NOT_SUPPORTED_THIRD_PARTY_API;
      }
    }
    // keep record of all created projects and who did from which api
    const importHistoryRecord = ThirdPartyProjectImport.create({
      projectName: newProject.title,
      project: newProject,
      user: currentAdmin,
      thirdPartyAPI,
    });
    await importHistoryRecord.save();
  } catch (e) {
    message = e.message;
    type = 'danger';
    logger.error('import third party project error', e.message);
  }

  response.send({
    redirectUrl: 'list',
    record: {},
    notice: {
      message,
      type,
    },
  });
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
      isProjectVerified,
      segmentNotified,
    } = request.payload;
    if (!priceUsd) {
      throw new Error('priceUsd is required');
    }
    const networkId = Number(transactionNetworkId);
    let transactions: NetworkTransactionInfo[] = [];
    let donationType;

    if (txType === 'csvAirDrop') {
      // transactions = await getDisperseTransactions(txHash, networkId);
      transactions = await getCsvAirdropTransactions(txHash, networkId);
      donationType = DONATION_TYPES.CSV_AIR_DROP;
    } else if (txType === 'gnosisSafe') {
      // transactions = await getDisperseTransactions(txHash, networkId);
      transactions = await getGnosisSafeTransactions(txHash, networkId);
      donationType = DONATION_TYPES.GNOSIS_SAFE;
    } else {
      if (!currency) {
        throw new Error(errorMessages.INVALID_TOKEN_SYMBOL);
      }
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
        currency: transactionInfo?.currency,
        segmentNotified,
        amount: transactionInfo?.amount,
        valueUsd: (transactionInfo?.amount as number) * priceUsd,
        status: DONATION_STATUS.VERIFIED,
        isProjectVerified,
        donationType,
        createdAt: new Date(transactionInfo?.timestamp * 1000),
        anonymous: true,
        isTokenEligibleForGivback: true,
      });
      const donor = await findUserByWalletAddress(transactionInfo?.from);
      if (donor) {
        donation.anonymous = false;
        donation.user = donor;
      }
      await donation.save();
      await updateTotalDonationsOfProject(project.id);
      if (donor) {
        await updateUserTotalDonated(donor.id);
      }

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
