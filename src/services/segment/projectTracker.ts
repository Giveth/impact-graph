import { User } from '../../entities/user';
import { Project } from '../../entities/project';
import {
  getAnalytics,
  NOTIFICATIONS_EVENT_NAMES,
} from '../../analytics/analytics';
import { addSegmentEventToQueue } from '../../analytics/segmentQueue';
import { findUserById } from '../../repositories/userRepository';

const analytics = getAnalytics();

/**
 * Notifies Segment any event concerning the project
 */
class ProjectTracker {
  project: Project;
  eventName: NOTIFICATIONS_EVENT_NAMES;
  projectOwner?: User | null;

  constructor(projectToUpdate: Project, eventTitle: NOTIFICATIONS_EVENT_NAMES) {
    this.project = projectToUpdate;
    this.eventName = eventTitle;
  }

  async track() {
    this.projectOwner = await findUserById(Number(this.project.admin));
    if (this.projectOwner) {
      addSegmentEventToQueue({
        event: this.eventName,
        analyticsUserId: this.projectOwner.segmentUserId(),
        properties: this.segmentProjectAttributes(),
        anonymousId: null,
      });
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
