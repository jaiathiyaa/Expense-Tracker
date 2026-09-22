import {Router} from 'express';
import {getAllTransactions, createTransaction , getTransactionById , getTransactionsByDateRange , getTransactionsByType , updateTransactionById , deleteTransactionById , deleteTransactionByRange} from '../controllers/transaction.controller';

const router = Router();

router.get('/transactions', getAllTransactions);
// router.get('/transactions/range', getTransactionsByDateRange);
// router.get('/transactions/type',getTransactionsByType)
router.get('/transactions/:id', getTransactionById);
router.post('/transactions', createTransaction);
router.put('/transactions/:id', updateTransactionById);

// First Check for Range Deletion
router.delete('/transactions/range', deleteTransactionByRange);
// Then check for id
router.delete('/transactions/:id', deleteTransactionById);

export default router;