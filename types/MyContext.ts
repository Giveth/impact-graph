import { Request, Response } from 'express';
import { createAuthorsLoader } from '../utils/authorsLoader';

interface GraphRequest extends Request {
  user: any;
  auth: any;
}

export interface MyContext {
  req: GraphRequest;
  res: Response;
  authorsLoader: ReturnType<typeof createAuthorsLoader>;
}
