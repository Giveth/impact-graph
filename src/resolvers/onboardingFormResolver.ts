import { Arg, Query, Resolver } from 'type-graphql';
import { getNotificationAdapter } from '../adapters/adaptersFactory';
import { logger } from '../utils/logger';

@Resolver()
export class OnboardingFormResolver {
  @Query(_returns => Boolean)
  async subscribeOnboarding(@Arg('email') email: string): Promise<boolean> {
    try {
      const response = await getNotificationAdapter().subscribeOnboarding({
        email,
      });
      return response;
    } catch (e) {
      logger.debug('subscribeOnboarding() error', e);
      return false;
    }
  }
}
