import { AuthChecker } from 'type-graphql';
import { Context } from '../context.js';

export const userCheck: AuthChecker<Context> = () => {
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, e.g. ["ADMIN", "MODERATOR"]

  return true; // or false if access is denied
};
