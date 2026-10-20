import type { Request } from "express";

export interface AuthenticatedUserContext {
  id: string;
  authenticationType?: "DEV_API_KEY" | "ENTRA_SSO";
  permissions: string[];
  roles?: string[];
  groups?: string[];
  scopes?: string[];
  sessionId?: string;
  oid?: string;
  tid?: string;
  name?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUserContext;
  correlationId?: string;
}
