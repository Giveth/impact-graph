import Analytics from 'analytics-node';
import config from './config';
import { User } from './entities/user';

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

  track(eventName, analyticsUserId, properties, anonymousId) {
    // console.log(
    //   `{ eventName, analyticsUserId, properties, anonymousId } : ${JSON.stringify(
    //     { eventName, analyticsUserId, properties, anonymousId },
    //     null,
    //     2
    //   )}`
    // )

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

export function getAnalytics() {
  let options;
  if (config.get('ENVIRONMENT') === 'local') {
    options = {
      flushAt: 1,
    };
  } else {
    options: {
    }
  }
  const segmentAnalytics = new Analytics(
    config.get('SEGMENT_API_KEY'),
    options,
  );
  return new GraphAnalytics(segmentAnalytics);
}
