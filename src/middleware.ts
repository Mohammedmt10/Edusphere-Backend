import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { secret } from "./config";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const authMiddleware: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    res.status(401).json({ message: "no token provided" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      res.status(401).json({ message: "incorrect token" });
      return;
    }

    req.userId = decoded._id;
    next();

  } catch (error) {
    res.status(401).json({ message: "invalid token" });
  }
};
