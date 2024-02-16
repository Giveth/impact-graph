import { Donation } from '../../entities/donation';
import { Project } from '../../entities/project';
import { User } from '../../entities/user';
import exp from 'constants';

export interface BroadCastNotificationInputParams {
  broadCastNotificationId: number;
  html: string;
}

export interface ProjectsHaveNewRankingInputParam {
  projectRanks: {
    projectId: number;
    newRank: number;
    oldRank: number;
    round: number;
  }[];
  oldBottomRank: number;
  newBottomRank: number;
}

export interface NotificationAdapterInterface {
  updateOrttoUser(params: {
    firstName?: string;
    lastName?: string;
    email?: string;
    personId?: string;
  }): Promise<{
    people: {
      person_id: string;
      status: string;
    }[];
  }>;

  donationReceived(params: {
    donation: Donation;
    project: Project;
    user: User | null;
  }): Promise<void>;

  donationSent(params: {
    donation: Donation;
    project: Project;
    donor: User;
  }): Promise<void>;

  projectReceivedHeartReaction(params: {
    project: Project;
    userId: number;
  }): Promise<void>;

  projectVerified(params: { project: Project }): Promise<void>;
  projectBoosted(params: { projectId: number; userId: number }): Promise<void>;
  projectBoostedBatch(params: {
    projectIds: number[];
    userId: number;
  }): Promise<void>;
  projectBadgeRevoked(params: { project: Project }): Promise<void>;
  projectBadgeRevokeReminder(params: { project: Project }): Promise<void>;
  projectBadgeRevokeWarning(params: { project: Project }): Promise<void>;
  projectBadgeRevokeLastWarning(params: { project: Project }): Promise<void>;
  projectBadgeUpForRevoking(params: { project: Project }): Promise<void>;
  projectUnVerified(params: { project: Project }): Promise<void>;
  verificationFormRejected(params: { project: Project }): Promise<void>;

  projectListed(params: { project: Project }): Promise<void>;

  projectDeListed(params: { project: Project }): Promise<void>;

  projectSavedAsDraft(params: { project: Project }): Promise<void>;
  projectPublished(params: { project: Project }): Promise<void>;
  projectEdited(params: { project: Project }): Promise<void>;
  projectGotDraftByAdmin(params: { project: Project }): Promise<void>;
  projectCancelled(params: { project: Project }): Promise<void>;
  projectUpdateAdded(params: {
    project: Project;
    update: string;
  }): Promise<void>;
  projectDeactivated(params: { project: Project }): Promise<void>;
  projectReactivated(params: { project: Project }): Promise<void>;
  ProfileIsCompleted(params: { user: User }): Promise<void>;
  ProfileNeedToBeCompleted(params: { user: User }): Promise<void>;
  donationGetPriceFailed(params: {
    project: Project;
    donationInfo: { txLink: string; reason: string };
  }): Promise<void>;
  broadcastNotification(
    params: BroadCastNotificationInputParams,
  ): Promise<void>;
  projectsHaveNewRank(params: ProjectsHaveNewRankingInputParam): Promise<void>;
}
