import { MiddlewareFn } from 'type-graphql';
import type { ApolloContext } from '../types/ApolloContext';

/**
 * Field-level guard for private `User` fields (the columns that
 * `publicSelectionFields` deliberately omits: email, twitterName, ...).
 *
 * `User` is embedded in many public GraphQL types (project.adminUser,
 * donation.user, cause.adminUser, ...). Repositories are expected to select
 * only `publicSelectionFields` for non-owners, but any `leftJoinAndSelect` /
 * eager relation load bypasses that convention and returns the full row.
 * This middleware makes the guarantee independent of how the row was loaded:
 * the field resolves only when the signed-in user IS the user being read;
 * everyone else (including anonymous callers) gets `null`.
 *
 * The ownership check runs before `next()` so non-owners never execute the
 * underlying field resolver.
 */
export const OwnerOnlyUserField: MiddlewareFn<ApolloContext> = async (
  { root, context },
  next,
) => {
  const userId = context.req.user?.userId;
  if (userId == null || Number(root?.id) !== Number(userId)) {
    return null;
  }
  return next();
};
