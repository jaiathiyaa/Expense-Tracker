import {Request, Response} from 'express';
import {prisma} from '../lib/prisma';
import { TransactionType } from "@prisma/client";

export const getAllTransactions = async (req: Request, res: Response) => {
    try{
        const pagelimit = parseInt(req.query.limit as string) || 10; // Default limit is 10
        const page = parseInt(req.query.page as string) || 1;
        const offset = (page - 1) * pagelimit;
        if(page < 1) {
            return res.status(400).json({ error: "Page number must be greater than or equal to 1." });
        }

        if(pagelimit < 1 || pagelimit > 100) {
            return res.status(400).json({ error: "Limit must be a positive integer between 1 and 100." });
        }

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
        
        const userId = req.user?.id;
        if(!userId){
            return res.status(401).json({
                error : "Unauthorized"
            });
        }
        const whereClause: any = {};
        if(type) {
            whereClause.type = type;
        }
        whereClause.userId = userId;
        if(startDate && endDate) {
            if(isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: "Invalid date format. Please use YYYY-MM-DD." });
            }
            whereClause.date = {
                gte: start,
                lte: end
            };
            if(start > end){
                return res.status(400).json({ error: "Start date cannot be after end date." });
            }
        }
        const [transactions , total] = await Promise.all([
            prisma.transaction.findMany({
                where: whereClause,
                orderBy: {
                    [sortBy]: order
                },
                take: pagelimit,
                skip: offset
            }), 
            prisma.transaction.count({ 
                where: whereClause 
            })
        ]);

        const totalPages = Math.ceil(total / pagelimit);
        res.status(200).json({
            data: transactions,
            pagination: {
                total,
                page,
                limit: pagelimit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    }
    catch(error){
        console.error("Error fetching transactions:", error);
        res.status(500).json({error: "An error occurred while fetching transactions."});
    }
};

export const getTransactionById = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;

        const userId = req.user?.id;

        if(!userId){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }

        const transaction = await prisma.transaction.findFirst({
            where: { 
                id: String(id),
                userId: userId
            }
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


export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { title, description, amount, category, type, date } = req.body;
        const clientTxId = (req.body.clientTxId || req.headers['x-idempotency-key'] as string)?.trim() || undefined;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }
        if (!title || amount === undefined || amount === null || !type) {
            return res.status(400).json({
                error: "Title, amount and type are required."
            });
        }
        if (type !== "EXPENSE" && type !== "INCOME") {
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }
        const numericAmount = Number(amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                error: "Amount must be a valid positive number."
            });
        }

        // Idempotency check: if clientTxId is supplied, check if already recorded for this user
        if (clientTxId) {
            const existing = await prisma.transaction.findUnique({
                where: {
                    userId_clientTxId: {
                        userId,
                        clientTxId
                    }
                }
            });
            if (existing) {
                return res.status(200).json(existing);
            }
        }

        try {
            const newTransaction = await prisma.transaction.create({
                data: {
                    title: title.trim(),
                    description: description ? description.trim() : null,
                    amount: numericAmount,
                    category: category ? category.trim() : null,
                    type,
                    date: date ? new Date(date) : new Date(),
                    userId,
                    clientTxId
                }
            });
            return res.status(201).json(newTransaction);
        } catch (innerError: any) {
            // Handle race condition if duplicate request arrives simultaneously
            if (innerError.code === 'P2002' && clientTxId) {
                const existing = await prisma.transaction.findUnique({
                    where: {
                        userId_clientTxId: {
                            userId,
                            clientTxId
                        }
                    }
                });
                if (existing) {
                    return res.status(200).json(existing);
                }
            }
            throw innerError;
        }
    }
    catch (error) {
        console.error("Error creating transaction:", error);
        res.status(500).json({ error: "An error occurred while creating the transaction." });
    }
};

export const updateTransactionById = async (req : Request , res: Response) => {
    try{
        const {id} = req.params;
        const { title , description , amount, category , type , date } = req.body;
        const userId = req.user?.id;
        if(!userId){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
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
        const result = await prisma.transaction.updateMany({
            where: {
                id: String(id),
                userId
            },
            data: {
                title: title.trim(),
                description,
                amount: numericAmount,
                category,
                type,
                ...(date !== undefined && {
                    date: new Date(date)
                })
            }
        });

        if (result.count === 0) {
            return res.status(404).json({
                error: "Transaction not found."
            });
        }

        const updatedTransaction = await prisma.transaction.findFirst({
            where: {
                id: String(id),
                userId
            }
        });

        return res.status(200).json(updatedTransaction);
    }
    catch(error){
        console.error("Error updating transaction:", error);
        res.status(500).json({error: "An error occurred while updating the transaction."});
    }
}

export const deleteTransactionById = async (req:Request , res: Response) => {
    try{
        const {id} = req.params;
        const userId = req.user?.id;
        if(!userId){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
        const result = await prisma.transaction.deleteMany({
            where: {
                id: String(id),
                userId
            }
        });

        if (result.count === 0) {
            return res.status(404).json({
                error: "Transaction not found."
            });
        }

        return res.status(200).json({
            message: "Transaction deleted successfully."
        });
    }
    catch(error){
        console.error("Error deleting transaction:", error);
        res.status(500).json({error: "An error occurred while deleting the transaction."});
    }
}

export const deleteTransactionByRange = async (req: Request, res: Response) => {
    try{
        const { startDate, endDate } = req.body;
        const userId = req.user?.id;
        if(!userId){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "Start date and end date are required." });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (
            isNaN(start.getTime()) ||
            isNaN(end.getTime())
        ) {
            return res.status(400).json({
                error: "Invalid date format."
            });
        }

        if (start > end) {
            return res.status(400).json({
                error: "Start date cannot be after end date."
            });
        }

        const result = await prisma.transaction.deleteMany({
            where: {
                date: {
                    gte: start,
                    lte: end
                },
                userId
            }
        });

        return res.status(200).json({
            message: "Transactions deleted successfully.",
            deletedCount: result.count
        });
    }
    catch(error){
        console.error("Error deleting transactions:", error);
        res.status(500).json({error: "An error occurred while deleting the transactions."});
    }
}

export const getTransactionsByDateRange = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const userId = req.user?.id;
        if(!userId){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
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
                },
                userId: userId 
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
        const userId = req.user?.id;
        if(!userId){
            return res.status(401).json({
                error: "Unauthorized"
            })
        }
        if (!type || (type !== "EXPENSE" && type !== "INCOME")) {
            return res.status(400).json({ error: "Type must be either 'EXPENSE' or 'INCOME'." });
        }

        const transactions = await prisma.transaction.findMany({
            where: { 
                type: type as TransactionType ,
                userId: userId
            },
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

export const exportTransactionsCsv = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' }
        });

        const sanitizeAndEscapeCsv = (val: string | number | null | undefined, isText: boolean = true): string => {
            if (val === null || val === undefined) return '""';
            let str = String(val);

            // Neutralize spreadsheet formula injection on text fields
            // Attackers can exploit fields starting with =, +, -, @, tab, or carriage return (even with leading whitespace)
            if (isText && str.length > 0) {
                const trimmed = str.trimStart();
                if (/^[=+\-@\t\r]/.test(trimmed)) {
                    str = `'` + str;
                }
            }

            // Standard RFC 4180 CSV escaping: double any embedded double quotes and wrap in quotes
            const escaped = str.replace(/"/g, '""');
            return `"${escaped}"`;
        };

        const headers = ["ID", "Date", "Title", "Type", "Category", "Amount", "Description"];
        const rows = transactions.map(t => [
            sanitizeAndEscapeCsv(t.id, false),
            sanitizeAndEscapeCsv(t.date ? new Date(t.date).toISOString().split('T')[0] : '', false),
            sanitizeAndEscapeCsv(t.title, true),
            sanitizeAndEscapeCsv(t.type, false),
            sanitizeAndEscapeCsv(t.category || 'General', true),
            sanitizeAndEscapeCsv(t.amount.toFixed(2), false),
            sanitizeAndEscapeCsv(t.description || '', true)
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\r\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error("Error exporting transactions:", error);
        return res.status(500).json({ error: "Failed to export transactions." });
    }
};