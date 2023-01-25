import { Response } from 'express';
import { Pool, ModuleThread } from 'threads';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';
import { JwtVerifiedUser } from '../services/authorizationServices';

export interface ContextRequest {
  user: JwtVerifiedUser;
  auth: any;
}

export interface ApolloContext {
  req: ContextRequest;
  projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;
}
