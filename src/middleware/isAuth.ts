import { MiddlewareFn } from 'type-graphql';

import { ApolloContext } from '../types/ApolloContext';

export const isAuth: MiddlewareFn<ApolloContext> = async (
  { context },
  next,
) => {
  // @ts-ignore
  if (!context?.req?.session?.userId) {
    throw new Error('not authenticated');
  }

  return next();
};
