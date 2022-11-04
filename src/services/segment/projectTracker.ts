import { User } from '../../entities/user';
import { Project } from '../../entities/project';
import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import { findUserById } from '../../repositories/userRepository';
import { SegmentAnalyticsSingleton } from './segmentAnalyticsSingleton';

/**
 * Notifies Segment any event concerning the project
 */
class ProjectTracker {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  projectOwner?: User;

  constructor(projectToUpdate: Project, eventTitle: NOTIFICATIONS_EVENT_NAMES) {
    this.project = projectToUpdate;
    this.eventName = eventTitle;
  }

  async track() {
    this.projectOwner = await findUserById(Number(this.project.admin));
    if (this.projectOwner) {
      SegmentAnalyticsSingleton.getInstance().track(
        this.eventName,
        this.projectOwner.segmentUserId(),
        this.segmentProjectAttributes(),
        null,
      );
    }
  }

  private segmentProjectAttributes() {
    return {
      email: this.projectOwner?.email,
      title: this.project.title,
      lastName: this.projectOwner?.lastName,
      firstName: this.projectOwner?.firstName,
      OwnerId: this.projectOwner?.id,
      slug: this.project.slug,
      walletAddress: this.project.walletAddress,
    };
  }
}

export default ProjectTracker;
