
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

interface AuthTokenPayload extends JwtPayload {
    userId: string;
}

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Authentication token is required."
            });
        }

        const token = authHeader.split(" ")[1];

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error("JWT_SECRET is not configured.");
            return res.status(500).json({
                error: "Internal server error."
            });
        }

        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded === "string" ||
            typeof decoded.userId !== "string" ||
            !decoded.userId
        ) {
            return res.status(401).json({
                error: "Invalid authentication token."
            });
        }

        req.user = {
            id: decoded.userId
        };

        next();
    } catch {
        return res.status(401).json({
            error: "Invalid or expired authentication token."
        });
    }
};
