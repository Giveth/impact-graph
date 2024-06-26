import { Args, Query, Resolver } from 'type-graphql';
import { QfRound } from '../entities/qfRound';
import { getNotificationAdapter } from '../adapters/adaptersFactory';

@Resolver()
export class OnboardingFormResolver {
  @Query(_returns => [QfRound], { nullable: true })
  async subscribeOnboarding(
    @Args()
    { email }: { email: string },
  ) {
    return await getNotificationAdapter().subscribeOnboarding({ email });
  }
}
