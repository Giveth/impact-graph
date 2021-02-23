import { Organisation } from './organisation';
import { OrganisationUser } from './organisationUser';
import { User } from './user';
import { Project, ProjectUpdate } from './project';
import { Reaction } from './reaction';
import { Category } from './category';
import { Donation } from './donation';
import { Wallet } from './wallet';
import { ProjectStatus } from './projectStatus';
import Notification from './notification';
import { BankAccount, StripeTransaction } from './bankAccount';

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
    Wallet,
    ProjectStatus
]