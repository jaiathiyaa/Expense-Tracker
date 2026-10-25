
import { Router } from "express";
import {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    deleteAccount
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/authMiddleware";
import { loginRateLimiter, registerRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/register", registerRateLimiter, register);
router.post("/login", loginRateLimiter, login);

// Authenticated user account routes (strictly scoped to req.user.id)
router.get("/me", authMiddleware, getMe);
router.put("/profile", authMiddleware, updateProfile);
router.put("/change-password", authMiddleware, changePassword);
router.delete("/account", authMiddleware, deleteAccount);

export default router;
