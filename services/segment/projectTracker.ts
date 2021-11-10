import { User } from '../../entities/user';
import { Project } from '../../entities/project';
import { getAnalytics, SegmentEvents } from '../../analytics';

const analytics = getAnalytics();

/**
 * Notifies Segment any event concerning the project
 */
class ProjectTracker {
  project: Project;
  eventName: SegmentEvents;
  projectOwner?: User;

  constructor(projectToUpdate: Project, eventTitle: SegmentEvents) {
    this.project = projectToUpdate;
    this.eventName = eventTitle;
  }

  async track() {
    this.projectOwner = await User.findOne({ id: Number(this.project.admin) });

    if (this.projectOwner) {
      analytics.track(
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
