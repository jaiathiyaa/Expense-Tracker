
import { Router } from "express";
import {
    getDashboardSummary,
    getCategoryBreakdown,
    getMonthlySummary,
    getAnalytics,
} from "../controllers/dashboard.controller";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/summary", getDashboardSummary);
router.get("/categories", getCategoryBreakdown);
router.get("/monthly-summary", getMonthlySummary);
router.get("/analytics", getAnalytics);

export default router;
