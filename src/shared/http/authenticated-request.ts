import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    permissions: string[];
  };
  correlationId?: string;
}
