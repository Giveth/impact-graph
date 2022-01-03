import { Organisation } from './organisation';
import { OrganisationUser } from './organisationUser';
import { User } from './user';
import { Project, ProjectUpdate } from './project';
import { Reaction } from './reaction';
import { Category } from './category';
import { Token } from './token';
import { Donation } from './donation';
import { Wallet } from './wallet';
import { ProjectStatus } from './projectStatus';
import { ProjectImage } from './projectImage';
import Notification from './notification';
import { BankAccount, StripeTransaction } from './bankAccount';
import { AccountVerification } from './accountVerification';

export const entities: any = [
  Organisation,
  OrganisationUser,
  User,
  Project,
  Notification,
  BankAccount,
  StripeTransaction,
  Category,
  ProjectUpdate,
  Reaction,
  Donation,
  Token,
  Wallet,
  ProjectStatus,
  AccountVerification,
  ProjectImage,
];
