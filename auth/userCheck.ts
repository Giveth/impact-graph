import { AuthChecker } from 'type-graphql'
import { Context } from '../Context'

export const userCheck: AuthChecker<Context> = (
  { root, args, context, info },
  roles
) => {
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]
  console.log(`james context !!!!! : ${JSON.stringify(context, null, 2)}`)

  return true // or false if access is denied
}
