import { Arg, Query, Resolver } from 'type-graphql';
import { getNotificationAdapter } from '../adapters/adaptersFactory.js';
import { logger } from '../utils/logger.js';

@Resolver()
export class OnboardingFormResolver {
  @Query(_returns => Boolean)
  async subscribeOnboarding(@Arg('email') email: string): Promise<boolean> {
    try {
      await getNotificationAdapter().subscribeOnboarding({ email });
      return true;
    } catch (e) {
      logger.debug('subscribeOnboarding() error', e);
      return false;
    }
  }
}
