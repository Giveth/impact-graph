import { PubSubEngine } from 'graphql-subscriptions';
import {
  Resolver,
  Subscription,
  Root,
  Mutation,
  Arg,
  PubSub,
} from 'type-graphql';

import Notification from '../entities/notification';
import NotificationPayload from '../entities/notificationPayload';
import { logger } from '../utils/logger';

@Resolver(of => Notification)
export class NotificationResolver {
  @Subscription({
    topics: 'NOTIFICATIONS',
  })
  newNotification(@Root() { id, message }: NotificationPayload): Notification {
    const newNotification: Notification = { id, message, date: new Date() };
    logger.debug(
      `notificationPayload : ${JSON.stringify(newNotification, null, 2)}`,
    );
    return newNotification;
  }

  @Mutation(returns => Boolean)
  async triggerNotification(
    @Arg('trigger') input: boolean,
    @PubSub() pubSub: PubSubEngine,
  ) {
    const payload: NotificationPayload = {
      id: 1,
      message: 'A notification was triggered',
    };

    await pubSub.publish('NOTIFICATIONS', payload);
    return true;
  }
}
