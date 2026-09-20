import {Request, Response} from 'express';
import {prisma} from '../lib/prisma';

export const getAllTransactions = async (req: Request, res: Response) =>{
    try{
        const transactions = await prisma.transaction.findMany({
            orderBy: {
                createdAt: 'desc'
            },
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
        if (!title || !description || !amount || !category || !type || !date) {
            return res.status(400).json({ error: "All fields are required." });
        }
        if( type !== "EXPENSE" && type !== "INCOME"){
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }
        const newTransaction = await prisma.transaction.create({
            data :{
                title,
                description,
                amount: Number(amount),
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
