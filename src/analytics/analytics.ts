import Analytics from 'analytics-node';
import config from '../config';
import { User } from '../entities/user';

export enum NOTIFICATIONS_EVENT_NAMES {
  DRAFTED_PROJECT_ACTIVATED = 'Draft published',
  PROJECT_LISTED = 'Project listed',
  PROJECT_UNLISTED = 'Project unlisted',
  PROJECT_EDITED = 'Project edited',
  PROJECT_BADGE_REVOKED = 'Project badge revoked',
  PROJECT_BADGE_REVOKE_REMINDER = 'Project badge revoke reminder',
  PROJECT_BADGE_REVOKE_WARNING = 'Project badge revoke warning',
  PROJECT_BADGE_REVOKE_LAST_WARNING = 'Project badge revoke last warning',
  PROJECT_BADGE_UP_FOR_REVOKING = 'Project badge up for revoking',
  PROJECT_VERIFIED = 'Project verified',
  PROJECT_REJECTED = 'Project rejected',
  PROJECT_UNVERIFIED = 'Project unverified',
  PROJECT_ACTIVATED = 'Project activated',
  PROJECT_DEACTIVATED = 'Project deactivated',
  PROJECT_CANCELLED = 'Project cancelled',
  SEND_EMAIL_CONFIRMATION = 'Send email confirmation',
  MADE_DONATION = 'Made donation',
  DONATION_RECEIVED = 'Donation received',
  PROJECT_RECEIVED_HEART = 'Project received heart',
  PROJECT_UPDATED_DONOR = 'Project updated - donor',
  PROJECT_UPDATED_OWNER = 'Project updated - owner',
  PROJECT_CREATED = 'Project created',
  UPDATED_PROFILE = 'Updated profile',
  GET_DONATION_PRICE_FAILED = 'Get Donation Price Failed',
  VERIFICATION_FORM_GOT_DRAFT_BY_ADMIN = 'Verification form got draft by admin',
}

const environment = config.get('ENVIRONMENT') as string;

class GraphAnalytics {
  analytics: Analytics;
  constructor(analytics: Analytics) {
    this.analytics = analytics;
  }

  identifyUser(user: User) {
    this.analytics.identify({
      userId: user.segmentUserId(),
      traits: {
        firstName: user.firstName,
        email: user.email,
        registeredAt: new Date(),
      },
    });
  }

  track(
    eventName: NOTIFICATIONS_EVENT_NAMES,
    analyticsUserId,
    properties,
    anonymousId,
  ) {
    let userId;
    if (!analyticsUserId) {
      userId = anonymousId;
    } else {
      userId = analyticsUserId;
    }

    this.analytics.track({
      event: eventName,
      userId: analyticsUserId,
      properties,
      anonymousId,
    });
  }
}

// Enable property defines if it calls segment api or not
// Disabled on tests for time optimization
export function getAnalytics() {
  const segmentAnalytics = new Analytics(config.get('SEGMENT_API_KEY'), {
    flushAt: 1,
    enable: environment !== 'test',
  });
  return new GraphAnalytics(segmentAnalytics);
}
