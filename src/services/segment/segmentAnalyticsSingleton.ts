import { NOTIFICATIONS_EVENT_NAMES } from '../../analytics/analytics';
import { User } from '../../entities/user';
import { redisConfig } from '../../redis';

// tslint:disable-next-line:no-var-requires
const segmentApiKey = process.env.SEGMENT_API_KEY;
import { SegmentAnalytics } from 'segment-analytics-node';
import { sleep } from '../../utils/utils';

const options = {
  redisConnectionInfo: {
    host: String(redisConfig.host),
    port: Number(redisConfig.port),
    password: redisConfig.password ? String(redisConfig.password) : undefined,
  },
  requestsPerSecond: 1,
  sleepMilliSecondBetweenEvents: 50,
};

// one instance running
export class SegmentAnalyticsSingleton {
  private static instance: SegmentAnalyticsSingleton;
  private static segmentAnalyticsInstance: SegmentAnalytics;

  static getInstance(): SegmentAnalyticsSingleton {
    if (!SegmentAnalyticsSingleton.instance) {
      return new SegmentAnalyticsSingleton();
    }
    return SegmentAnalyticsSingleton.instance;
  }

  private constructor() {
    SegmentAnalyticsSingleton.segmentAnalyticsInstance = new SegmentAnalytics(
      segmentApiKey as string,
      options,
    );
    return this;
  }

  async identifyUser(user: User): Promise<void> {
    await SegmentAnalyticsSingleton.segmentAnalyticsInstance.identify({
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
  ): Promise<void> {
    const userId = analyticsUserId || anonymousId;
    await SegmentAnalyticsSingleton.segmentAnalyticsInstance.track({
      event: eventName,
      userId,
      properties,
      anonymousId,
    });
  }
}
