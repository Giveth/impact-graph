import adminJs, { ActionContext, AdminJSOptions } from 'adminjs';
import adminJsExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/typeorm';
import { IncomingMessage } from 'connect';
import cookie from 'cookie';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { User } from '../../entities/user.js';
import config from '../../config.js';
import { redis } from '../../redis.js';
import { logger } from '../../utils/logger.js';
import { findUserById } from '../../repositories/userRepository.js';
import { fetchAdminAndValidatePassword } from '../../services/userService.js';
import { campaignsTab } from './tabs/campaignsTab.js';
import { broadcastNotificationTab } from './tabs/broadcastNotificationTab.js';
import { mainCategoryTab } from './tabs/mainCategoryTab.js';
import { categoryTab } from './tabs/categoryTab.js';
import { projectsTab } from './tabs/projectsTab.js';
import { organizationsTab } from './tabs/organizationsTab.js';
import { usersTab } from './tabs/usersTab.js';
import { projectStatusHistoryTab } from './tabs/projectStatusHistoryTab.js';
import { projectStatusReasonTab } from './tabs/projectStatusReasonTab.js';
import { projectAddressTab } from './tabs/projectAddressTab.js';
import { projectStatusTab } from './tabs/projectStatusTab.js';
import { projectUpdateTab } from './tabs/projectUpdateTab.js';
import { thirdPartProjectImportTab } from './tabs/thirdPartProjectImportTab.js';
import { featuredUpdateTab } from './tabs/featuredUpdateTab.js';
import { generateTokenTab } from './tabs/tokenTab.js';
import { donationTab } from './tabs/donationTab.js';
import { projectVerificationTab } from './tabs/projectVerificationTab.js';
import { qfRoundTab } from './tabs/qfRoundTab.js';
import { qfRoundHistoryTab } from './tabs/qfRoundHistoryTab.js';
import { SybilTab } from './tabs/sybilTab.js';
import { ProjectFraudTab } from './tabs/projectFraudTab.js';
import { RecurringDonationTab } from './tabs/recurringDonationTab.js';
import { AnchorContractAddressTab } from './tabs/anchorContractAddressTab.js';

const secret = config.get('ADMIN_BRO_COOKIE_SECRET') as string;
const adminJsCookie = 'adminjs';
// @ts-expect-error as d
adminJs.registerAdapter({ Database, Resource });

export const getAdminJsRouter = async () => {
  const RedisStoreModule = await import('connect-redis');
  const RedisStore = RedisStoreModule.default(session);
  // @ts-expect-error as d
  return adminJsExpress.buildAuthenticatedRouter(
    await getadminJsInstance(),
    {
      authenticate: async (email, password): Promise<User | boolean> => {
        const admin = await fetchAdminAndValidatePassword({ email, password });
        if (!admin) {
          return false;
        }
        return admin;
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

// Extract Referrer Header Parameter Filter Params
export const extractAdminJsReferrerUrlParams = (req: ActionContext) => {
  const queryStrings = {};

  const refererUrlHeaderIndex = req?.rawHeaders?.indexOf('Referer');
  if (!refererUrlHeaderIndex || refererUrlHeaderIndex < 0) return {};

  const refererUrl = new URL(req.rawHeaders[refererUrlHeaderIndex + 1]);
  const searchParams = refererUrl.searchParams;

  // Extract filter names and values from URL query string parameters
  for (const [key, value] of searchParams.entries()) {
    const [, filter] = key.split('.');
    if (!filter) continue;

    queryStrings[filter] = value;
  }

  return queryStrings;
};

// Get CurrentSession for external express middlewares
export const getCurrentAdminJsSession = async (request: IncomingMessage) => {
  const RedisStoreModule = await import('connect-redis');
  const RedisStore = RedisStoreModule.default(session);
  const cookieHeader = request.headers.cookie;
  const parsedCookies = cookie.parse(cookieHeader);
  const sessionStore = new RedisStore({ client: redis });
  const unsignedCookie = cookieParser.signedCookie(
    parsedCookies[adminJsCookie],
    secret,
  );

  let adminUser;
  try {
    adminUser = await new Promise((success, failure) => {
      sessionStore.get(unsignedCookie, (err, sessionObject) => {
        if (err) {
          failure(err);
        } else {
          // @ts-expect-error adminUser is defined
          success(sessionObject?.adminUser);
        }
      });
    });
  } catch (e) {
    logger.error('getCurrentAdminJsSession error', e);
  }
  if (!adminUser) return false;

  const dbUser = await findUserById(adminUser.id);
  if (!dbUser) return false;

  return dbUser;
};

type AdminJsResources = AdminJSOptions['resources'];

const getResources = async (): Promise<AdminJsResources> => {
  const resources: AdminJsResources = [
    projectVerificationTab,
    donationTab,
    await generateTokenTab(),
    featuredUpdateTab,
    thirdPartProjectImportTab,
    projectUpdateTab,
    projectStatusTab,
    projectAddressTab,
    projectStatusReasonTab,
    projectStatusHistoryTab,
    usersTab,
    organizationsTab,
    projectsTab,
    categoryTab,
    mainCategoryTab,
    broadcastNotificationTab,
    campaignsTab,
    qfRoundTab,
    qfRoundHistoryTab,
    SybilTab,
    ProjectFraudTab,
    RecurringDonationTab,
    AnchorContractAddressTab,
  ];

  const loggingHook = async (response, request, context) => {
    const { action, currentAdmin, resource } = context;
    const { method, params } = request;

    const log = {
      currentAdmin,
      resource: resource.name(),
      action: action.name,
      method,
      response: context.record,
      params,
    };

    logger.debug('AdminJs Log', JSON.stringify(log, null, 2));

    return response;
  };
  // Add logging hook to all resources
  resources.forEach(resource => {
    const options = resource.options || {};
    const actions = options.actions || {};
    const resourceActionList = Object.keys(actions);
    const targetActionNames = Object.values(resourceActionList).filter(
      action => action !== 'show',
    );

    targetActionNames.forEach(actionName => {
      const action = actions[actionName] || {};
      if (!action.after) {
        action.after = loggingHook;
      } else if (Array.isArray(action.after)) {
        action.after.push(loggingHook);
      } else {
        action.after = [action.after, loggingHook];
      }
      actions[actionName] = action;
    });
    options.actions = actions;
    resource.options = options;
  });

  return resources;
};

const getadminJsInstance = async () => {
  const resources = await getResources();
  // @ts-expect-error as d
  const adminJsInstance = new adminJs({
    branding: {
      logo: 'https://i.imgur.com/cGKo1Tk.png',
      favicon:
        'https://icoholder.com/media/cache/ico_logo_view_page/files/img/e15c430125a607a604a3aee82e65a8f7.png',
      companyName: 'Giveth',
      // softwareBrothers: false,
    },
    resources,
    locale: {
      translations: {
        resources: {
          Donation: {
            properties: {
              transactionNetworkId: 'Network',
              transactionId: 'txHash',
              isProjectVerified: 'Givback Eligible',
              disperseTxHash:
                'disperseTxHash, this is optional, just for disperse transactions',
            },
          },
          // Project: {
          //   properties: {
          //     listed: 'Listed',
          //     'listed.true': 'Listed',
          //     'listed.false': 'Unlisted',
          //     'listed.null': 'Not Reviewed',
          //     'listed.undefined': 'Not Reviewed',
          //   },
          // },
        },
      },
      language: 'en',
    },
    rootPath: adminJsRootPath,
  });
  // adminJsInstance.watch();
  return adminJsInstance;
};

export const adminJsRootPath = '/admin';
