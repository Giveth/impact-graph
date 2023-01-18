import { Request, Response } from 'express';
import { Pool, ModuleThread } from 'threads';
import { ProjectResolverWorker } from '../workers/projectsResolverWorker';

interface GraphRequest extends Request {
  user: any;
  auth: any;
}

export interface MyContext {
  req: GraphRequest;
  res: Response;
  projectsFiltersThreadPool: Pool<ModuleThread<ProjectResolverWorker>>;
}
