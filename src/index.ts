import 'reflect-metadata';
import { registerGlobalErrorHandlers } from './utils/globalErrorHandlers';
import { bootstrap } from './server/bootstrap';

// Register process-level error handlers before anything async runs so a
// transient DB/pooler error rejecting a promise cannot crash the whole API.
registerGlobalErrorHandlers();

bootstrap();
