import { Arg, Query, Resolver } from 'type-graphql';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';

@Resolver()
export class OnboardingFormResolver {
  @Query(_returns => Boolean)
  async subscribeOnboarding(@Arg('email') email: string): Promise<boolean> {
    try {
      await getNotificationAdapter().subscribeOnboarding({ email });
      return true;
    } catch (e) {
      logger.debug('subscribeOnboarding() error', e);
      return e;
    }
  }
}
