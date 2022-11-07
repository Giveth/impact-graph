import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';

export interface NotificationAdapterInterface {
  donationReceived(params: {
    donation: Donation;
    project: Project;
  }): Promise<void>;

  donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void>;

  projectReceivedHeartReaction(params: { project: Project }): Promise<void>;

  projectVerified(params: { project: Project }): Promise<void>;
  projectBadgeRevoked(params: { project: Project }): Promise<void>;
  projectBadgeRevokeReminder(params: { project: Project }): Promise<void>;
  projectBadgeRevokeWarning(params: { project: Project }): Promise<void>;
  projectBadgeRevokeLastWarning(params: { project: Project }): Promise<void>;
  projectBadgeUpForRevoking(params: { project: Project }): Promise<void>;
  projectUnVerified(params: { project: Project }): Promise<void>;

  projectListed(params: { project: Project }): Promise<void>;

  projectDeListed(params: { project: Project }): Promise<void>;

  projectSavedAsDraft(params: { project: Project }): Promise<void>;
  projectPublished(params: { project: Project }): Promise<void>;
  projectCancelled(params: { project: Project }): Promise<void>;
  projectUpdateAdded(params: {
    project: Project;
    update: string;
  }): Promise<void>;
  projectDeactivated(params: { project: Project }): Promise<void>;
  projectReactivated(params: { project: Project }): Promise<void>;
  projectSendEmailConfirmation(params: { project: Project }): Promise<void>;
  ProfileIsCompleted(params: { user: User }): Promise<void>;
  ProfileNeedToBeCompleted(params: { user: User }): Promise<void>;
  donationGetPriceFailed(params: {
    project: Project;
    donationInfo: { txLink: string; reason: string };
  }): Promise<void>;
}
