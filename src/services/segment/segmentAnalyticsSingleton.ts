import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import { User } from '../../entities/user';
import { redisConfig } from '../../redis';

// tslint:disable-next-line:no-var-requires
const SegmentAnalyticsNode = require('segment-analytics-node');
const segmentApiKey = process.env.SEGMENT_API_KEY;
const redisOptions = {
  redisConnectionInfo: redisConfig,
  requestsPerSecond: 10,
};

// one instance running
export class SegmentAnalyticsSingleton {
  private static instance;

  constructor() {
    if (!SegmentAnalyticsSingleton.instance) {
      SegmentAnalyticsSingleton.instance = new SegmentAnalyticsNode(
        segmentApiKey,
        redisOptions,
      );
    }
  }

  async identifyUser(user: User) {
    await SegmentAnalyticsSingleton.instance.postUser({
      userId: user.segmentUserId(),
      traits: {
        firstName: user.firstName,
        email: user.email,
        registeredAt: new Date(),
      },
    });
  }

  async track(
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

    await SegmentAnalyticsSingleton.instance.postData({
      event: eventName,
      userId: analyticsUserId,
      properties,
      anonymousId,
    });
  }

  getInstance() {
    return SegmentAnalyticsSingleton.instance;
  }
}
