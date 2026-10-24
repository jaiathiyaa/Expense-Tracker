import { Router } from "express";
import { getUserById, updateUserById } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/users/:id", authMiddleware, getUserById);
router.put("/users/:id", authMiddleware, updateUserById);

export default router;