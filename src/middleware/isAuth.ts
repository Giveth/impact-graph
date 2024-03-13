import { MiddlewareFn } from 'type-graphql';

import { ApolloContext } from '../types/ApolloContext';

export const isAuth: MiddlewareFn<ApolloContext> = async (
  { context },
  next,
) => {
  // @ts-expect-error just skip error
  if (!context?.req?.session?.userId) {
    throw new Error('not authenticated');
  }

  return next();
};
