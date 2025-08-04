import { Pool, ModuleThread } from 'threads';
import { Request } from 'express';
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
  expressReq?: Request; // Express request object for IP checking
  projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;
}
