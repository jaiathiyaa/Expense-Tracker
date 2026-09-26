import {Router} from "express";
import { createUser, getUserById, updateUserById } from "../controllers/user.controller";

const router = Router();

router.post("/users",createUser);
router.get("/users/:id",getUserById);
router.put("/users/:id",updateUserById);

export default router;