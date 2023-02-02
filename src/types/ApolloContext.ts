import { Pool, ModuleThread } from 'threads';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';
import { JwtVerifiedUser } from '../services/authorizationServices';

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
  projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;
}
