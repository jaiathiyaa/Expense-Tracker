import { Router } from 'express';
import { chatWithAssistant, resetAssistantContext } from '../controllers/assistant.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/chat', chatWithAssistant);
router.post('/reset', resetAssistantContext);

export default router;
