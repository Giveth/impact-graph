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

  projectReceivedHeartReaction(params: {
    project: Project;
    user: User;
  }): Promise<void>;

  projectGotVerified(params: { project: Project }): Promise<void>;
}
