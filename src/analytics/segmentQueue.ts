// @ts-ignore
import Bull from 'bull';

import { getAnalytics } from './analytics';
import { sleep } from '../utils/utils';
import { redisConfig } from '../redis';
const analytics = getAnalytics();

const sendSegmentEventQueue = new Bull('send-segment-event', {
  redis: redisConfig,
});

const numberOfVerifyDonationConcurrentJob = 1;

export const addSegmentEventToQueue = (input: {
  event: string;
  analyticsUserId: string;
  properties: any;
  anonymousId: string | null;
}) => {
  sendSegmentEventQueue.add(input);
};

export const processSendSegmentEventsJobs = () => {
  sendSegmentEventQueue.process(
    numberOfVerifyDonationConcurrentJob,
    async (job, done) => {
      const { event, analyticsUserId, properties, anonymousId } = job.data;
      if (event) {
        analytics.track(event, analyticsUserId, properties, anonymousId);
        // When sending events to segment it misses some events when sending concurrent events
        // So I added a queue to send them consequentially and with 1.5 second time between them
        await sleep(1500);
      }

      done();
    },
  );
};
