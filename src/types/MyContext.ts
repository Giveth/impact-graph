import { Request, Response } from 'express';

interface GraphRequest extends Request {
  user: any;
  auth: any;
}

export interface MyContext {
  req: GraphRequest;
  res: Response;
  projectsFiltersThreadPool: any;
}
