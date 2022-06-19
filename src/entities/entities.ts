import { Organization } from './organization';
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
import { ProjectStatusReason } from './projectStatusReason';
import { ProjectStatusHistory } from './projectStatusHistory';
import { ThirdPartyProjectImport } from './thirdPartyProjectImport';
import { ProjectVerificationForm } from './projectVerificationForm';
import { ProjectAddress } from './projectAddress';
import { SocialProfile } from './socialProfile';

export const entities: any = [
  Organization,
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
  ProjectStatusReason,
  ProjectStatusHistory,
  AccountVerification,
  ProjectImage,
  ThirdPartyProjectImport,
  ProjectVerificationForm,
  ProjectAddress,
  SocialProfile,
];
