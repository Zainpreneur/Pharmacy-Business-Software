import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { unauthorized, forbidden } from "../utils/errors";

export interface AuthUser {
  id: number;
  email: string;
  role: "ADMIN" | "PHARMACIST" | "CASHIER";
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(unauthorized("Missing or invalid Authorization header"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    req.user = payload;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function authorize(...roles: AuthUser["role"][]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
