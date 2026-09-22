import {Request, Response} from 'express';
import {prisma} from '../lib/prisma';
import { TransactionType } from '@prisma/client/wasm';

export const getAllTransactions = async (req: Request, res: Response) =>{
    try{
        const pagelimit = parseInt(req.query.limit as string) || 10; // Default limit is 10
        const page = parseInt(req.query.page as string) || 1;
        const offset = (page - 1) * pagelimit;
        
        const order = req.query.order as string || 'desc'; // Default order is 'desc'
        if(order !== 'asc' && order !== 'desc') {
            return res.status(400).json({ error: "Invalid order. Allowed values are 'asc' or 'desc'." });
        }
        
        const sortBy = req.query.sortBy as string || 'createdAt'; // Default sort by 'createdAt'
        const allowedSortFields = ['createdAt', 'amount', 'date'];
        
        if(!allowedSortFields.includes(sortBy)) {
            return res.status(400).json({ error: `Invalid sort field. Allowed fields are: ${allowedSortFields.join(', ')}` });
        }
        
        const type = req.query.type as string;
        if(type && type !== "EXPENSE" && type !== "INCOME") {
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }

        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        if((startDate && !endDate) || (!startDate && endDate)) {
            return res.status(400).json({ error: "Both start date and end date must be provided for date range filtering." });
        }


        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);

        const whereClause: any = {};
        if(type) {
            whereClause.type = type;
        }
        if(startDate && endDate) {
            if(isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: "Invalid date format. Please use YYYY-MM-DD." });
            }
            whereClause.date = {
                gte: start,
                lte: end
            };
        }
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: {
                [sortBy]: order
            },
            take: pagelimit,
            skip: offset
        });
        res.status(200).json(transactions);
    }
    catch(error){
        console.error("Error fetching transactions:", error);
        res.status(500).json({error: "An error occurred while fetching transactions."});
    }
};

export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const transaction = await prisma.transaction.findUnique({
            where: { id: String(id) }
        });
        if (!transaction) {
            return res.status(404).json({ error: "Transaction not found." });
        }
        res.status(200).json(transaction);
    }
    catch(error){
        console.error("Error fetching transaction:", error);
        res.status(500).json({error: "An error occurred while fetching the transaction."});
    }
}


export const createTransaction = async (req: Request, res: Response) =>{
    try{
        const { title , description , amount, category , type , date } = req.body;
        if (!title || amount === undefined || amount === null || !type) {
            return res.status(400).json({
                error: "Title, amount and type are required."
            });
        }
        if( type !== "EXPENSE" && type !== "INCOME"){
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }
        const numericAmount = Number(amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "Amount must be a valid positive number."
            });
        }
        const newTransaction = await prisma.transaction.create({
            data :{
                title,
                description,
                amount: numericAmount,
                category,
                type,
                date: date ? new Date(date) : new Date(),
            }
        });
        res.status(201).json(newTransaction);
    }
    catch(error){
        console.error("Error creating transaction:", error);
        res.status(500).json({error: "An error occurred while creating the transaction."});
    }
}

export const updateTransactionById = async (req : Request , res: Response) => {
    try{
        const {id} = req.params;
        const { title , description , amount, category , type , date } = req.body;
        if( !title || amount === undefined || amount === null || !type){
            return res.status(400).json({
                error: "Title, amount and type are required."
            });
        }
        if(type !== "EXPENSE" && type !== "INCOME"){
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "Amount must be a valid positive number."
            });
        }
        const updateTransaction = await prisma.transaction.update({
            where: { id: String(id)},
            data: {
                title,
                description,
                amount: numericAmount,
                category,
                type,
                date: date ? new Date(date) : new Date(),
            }
        });
        res.status(200).json(updateTransaction);
    }
    catch(error){
        console.error("Error updating transaction:", error);
        res.status(500).json({error: "An error occurred while updating the transaction."});
    }
}

export const deleteTransactionById = async (req:Request , res: Response) => {
    try{
        const {id} = req.params;

        const deletedTransaction = await prisma.transaction.delete({
            where: { id: String(id) }
        })

        if(!deletedTransaction) {
            return res.status(404).json({ error: "Transaction not found." });
        }
        res.status(200).json({ message: "Transaction deleted successfully." });
    }
    catch(error){
        console.error("Error deleting transaction:", error);
        res.status(500).json({error: "An error occurred while deleting the transaction."});
    }
}

export const deleteTransactionByRange = async (req: Request, res: Response) => {
    try{
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start date and end date are required." });
        }

        const deletedTransactions = await prisma.transaction.deleteMany({
            where:  {
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            }
        })
        res.status(200).json({ message: "Transactions deleted successfully." });
    }
    catch(error){
        console.error("Error deleting transactions:", error);
        res.status(500).json({error: "An error occurred while deleting the transactions."});
    }
}

export const getTransactionsByDateRange = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start date and end date are required." });
        }
        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);

        const transactions = await prisma.transaction.findMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                }   
            },
            orderBy: {
                date: 'desc'
            }
        });

        res.status(200).json(transactions);
    } catch (error) {
        console.error("Error fetching transactions by date range:", error);
        res.status(500).json({ error: "An error occurred while fetching transactions by date range." });
    }
};

export const getTransactionsByType = async (req: Request, res: Response) => {
    try {
        const { type } = req.query;
        
        if (!type || (type !== "EXPENSE" && type !== "INCOME")) {
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }

        const transactions = await prisma.transaction.findMany({
            where: { type: type as TransactionType },
            orderBy: {
                date: 'desc'
            }
        });
        res.status(200).json(transactions);
    }
    catch (error) {
        console.error("Error fetching transactions by type:", error);
        res.status(500).json({ error: "An error occurred while fetching transactions by type." });
    }
};