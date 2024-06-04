import { Request as ExpressRequest } from "express";

export interface Request<
  B = any,
  Q extends qs.ParsedQs = any,
  P extends Record<string, string> = any,
  C extends Record<string, any> = any
> extends ExpressRequest {
  body: B;
  query: Q;
  params: P;
  cookies: C;
}
