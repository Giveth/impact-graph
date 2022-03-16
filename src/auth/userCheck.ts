import { AuthChecker } from 'type-graphql';
import { Context } from '../context';

export const userCheck: AuthChecker<Context> = (
  { root, args, context, info },
  roles,
) => {
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]

  return true; // or false if access is denied
};
