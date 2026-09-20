import {Router} from 'express';
import {getAllTransactions, createTransaction , getTransactionById} from '../controllers/transaction.controller';

const router = Router();

router.get('/transactions', getAllTransactions);
router.post('/transactions', createTransaction);
router.get('/transactions/:id', getTransactionById);

export default router;