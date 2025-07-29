import adminJs, { ActionContext, AdminJSOptions } from 'adminjs';
import adminJsExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/typeorm';
import { IncomingMessage } from 'connect';
import { User } from '../../entities/user';
import config from '../../config';
import { redis } from '../../redis';
import { logger } from '../../utils/logger';
import { findUserById } from '../../repositories/userRepository';
import { fetchAdminAndValidatePassword } from '../../services/userService';
import { campaignsTab } from './tabs/campaignsTab';
import { broadcastNotificationTab } from './tabs/broadcastNotificationTab';
import { mainCategoryTab } from './tabs/mainCategoryTab';
import { categoryTab } from './tabs/categoryTab';
import { projectsTab } from './tabs/projectsTab';
import { organizationsTab } from './tabs/organizationsTab';
import { usersTab } from './tabs/usersTab';
import { projectStatusHistoryTab } from './tabs/projectStatusHistoryTab';
import { projectStatusReasonTab } from './tabs/projectStatusReasonTab';
import { projectAddressTab } from './tabs/projectAddressTab';
import { projectStatusTab } from './tabs/projectStatusTab';
import { projectUpdateTab } from './tabs/projectUpdateTab';
import { thirdPartProjectImportTab } from './tabs/thirdPartProjectImportTab';
import { featuredUpdateTab } from './tabs/featuredUpdateTab';
import { generateTokenTab } from './tabs/tokenTab';
import { donationTab } from './tabs/donationTab';
import { projectVerificationTab } from './tabs/projectVerificationTab';
import { qfRoundTab } from './tabs/qfRoundTab';
import { qfRoundHistoryTab } from './tabs/qfRoundHistoryTab';
import { SybilTab } from './tabs/sybilTab';
import { ProjectFraudTab } from './tabs/projectFraudTab';
import { RecurringDonationTab } from './tabs/recurringDonationTab';
import { AnchorContractAddressTab } from './tabs/anchorContractAddressTab';
import { projectSocialMediaTab } from './tabs/projectSocialMediaTab';
// use redis for session data instead of in-memory storage
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RedisStore = require('connect-redis').default;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookie = require('cookie');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
const secret = config.get('ADMIN_BRO_COOKIE_SECRET') as string;
const adminJsCookie = 'adminjs';
adminJs.registerAdapter({ Database, Resource });

export const getAdminJsRouter = async () => {
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
          success(sessionObject.adminUser);
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
    projectSocialMediaTab,
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
        labels: {
          ProjectVerificationForm: 'GIVbacks Eligibility Form',
        },
        resources: {
          Donation: {
            properties: {
              transactionNetworkId: 'Network',
              transactionId: 'txHash',
              isProjectGivbackEligible: 'Givback Eligible',
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
