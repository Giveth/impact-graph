import { Pool, ModuleThread } from 'threads';
// @ts-expect-error migrate to ESM
import { ProjectResolverWorker } from '../workers/projectsResolverWorker.js';
import { JwtVerifiedUser } from '../services/authorizationServices.js';

export interface AuthContextRequest {
  token?: string;
  error?: Error;
}

export interface ContextRequest {
  user: JwtVerifiedUser;
  auth: AuthContextRequest;
}

export interface ApolloContext {
  req: ContextRequest;
  projectsFiltersThreadPool?: Pool<ModuleThread<ProjectResolverWorker>>;
}
