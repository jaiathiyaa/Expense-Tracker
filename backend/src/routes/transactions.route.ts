import {Router} from 'express';
import {getAllTransactions, createTransaction , getTransactionById , updateTransactionById , deleteTransactionById} from '../controllers/transaction.controller';

const router = Router();

router.get('/transactions', getAllTransactions);
router.get('/transactions/:id', getTransactionById);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransactionById);
router.delete('/transactions/:id', deleteTransactionById);

export default router;