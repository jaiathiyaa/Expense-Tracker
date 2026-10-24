
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { TransactionType } from "@prisma/client";

/**
 * GET /api/dashboard/analytics
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * Returns period-specific metrics for the Insights screen.
 * All results are scoped to the authenticated user.
 */
export const getAnalytics = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)." });
        }

        const start = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T23:59:59.999Z`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
        }
        if (start > end) {
            return res.status(400).json({ error: "startDate cannot be after endDate." });
        }

        // Calculate the matching previous period of the same length
        const periodMs = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1); // one ms before current start
        const prevStart = new Date(prevEnd.getTime() - periodMs);

        // Fetch current and previous period transactions in parallel (EXPENSE + INCOME)
        const [currentTxns, prevTxns] = await Promise.all([
            prisma.transaction.findMany({
                where: { userId, date: { gte: start, lte: end } },
                select: { id: true, title: true, amount: true, type: true, category: true, date: true },
                orderBy: { date: "asc" },
            }),
            prisma.transaction.findMany({
                where: { userId, date: { gte: prevStart, lte: prevEnd } },
                select: { amount: true, type: true, category: true },
            }),
        ]);

        // --- Current period EXPENSE-only ---
        const currentExpenses = currentTxns.filter((t) => t.type === TransactionType.EXPENSE);

        // Summary metrics
        const totalSpending = currentExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
        const calendarDays = Math.max(
            Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
            1
        );
        const avgDailySpending = totalSpending / calendarDays;
        const largestExpense = currentExpenses.reduce((max, t) => Math.max(max, Number(t.amount)), 0);
        const transactionCount = currentExpenses.length;

        // --- Category breakdown (current period) ---
        const categoryMap = new Map<string, number>();
        for (const t of currentExpenses) {
            const key = t.category || "Other";
            categoryMap.set(key, (categoryMap.get(key) ?? 0) + Number(t.amount));
        }
        const categories = Array.from(categoryMap.entries())
            .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
            .sort((a, b) => b.total - a.total);

        // --- Previous period category breakdown ---
        const prevCategoryMap = new Map<string, number>();
        for (const t of prevTxns) {
            if (t.type !== TransactionType.EXPENSE) continue;
            const key = t.category || "Other";
            prevCategoryMap.set(key, (prevCategoryMap.get(key) ?? 0) + Number(t.amount));
        }
        const prevCategories = Array.from(prevCategoryMap.entries())
            .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
            .sort((a, b) => b.total - a.total);

        const prevTotalSpending = prevTxns
            .filter((t) => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // --- Time-series aggregation for chart ---
        // Choose granularity based on period length
        const periodDays = calendarDays;
        let granularity: "day" | "week" | "month";
        if (periodDays <= 31) {
            granularity = "day";
        } else if (periodDays <= 93) {
            granularity = "week";
        } else {
            granularity = "month";
        }

        const timeSeriesMap = new Map<string, number>();

        // Pre-fill all buckets so empty periods show as zero
        if (granularity === "day") {
            const cursor = new Date(start);
            while (cursor <= end) {
                const key = cursor.toISOString().slice(0, 10);
                timeSeriesMap.set(key, 0);
                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
        } else if (granularity === "week") {
            // ISO week: week containing startDate going forward
            const cursor = new Date(start);
            while (cursor <= end) {
                const key = cursor.toISOString().slice(0, 10); // start of week
                timeSeriesMap.set(key, 0);
                cursor.setUTCDate(cursor.getUTCDate() + 7);
            }
        } else {
            // month
            const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
            const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
            while (cursor <= endMonth) {
                const key = cursor.toISOString().slice(0, 7);
                timeSeriesMap.set(key, 0);
                cursor.setUTCMonth(cursor.getUTCMonth() + 1);
            }
        }

        for (const t of currentExpenses) {
            const txDate = new Date(t.date);
            let key: string;
            if (granularity === "day") {
                key = txDate.toISOString().slice(0, 10);
            } else if (granularity === "week") {
                // find the start of the week bucket this transaction belongs to
                const dayDiff = Math.floor((txDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const weekOffset = Math.floor(dayDiff / 7);
                const weekStart = new Date(start);
                weekStart.setUTCDate(weekStart.getUTCDate() + weekOffset * 7);
                key = weekStart.toISOString().slice(0, 10);
            } else {
                key = txDate.toISOString().slice(0, 7);
            }
            if (timeSeriesMap.has(key)) {
                timeSeriesMap.set(key, (timeSeriesMap.get(key) ?? 0) + Number(t.amount));
            }
        }

        const timeSeries = Array.from(timeSeriesMap.entries()).map(([label, total]) => ({
            label,
            total: Number(total.toFixed(2)),
        }));

        // --- Top merchants (by title, expense only, current period) ---
        const merchantMap = new Map<string, { count: number; total: number; category: string | null }>();
        for (const t of currentExpenses) {
            const key = (t.title || "Unknown").trim();
            const existing = merchantMap.get(key);
            if (existing) {
                existing.count += 1;
                existing.total += Number(t.amount);
            } else {
                merchantMap.set(key, { count: 1, total: Number(t.amount), category: t.category ?? null });
            }
        }
        const topMerchants = Array.from(merchantMap.entries())
            .map(([title, data]) => ({
                title,
                count: data.count,
                total: Number(data.total.toFixed(2)),
                category: data.category,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        return res.status(200).json({
            period: { startDate, endDate, calendarDays, granularity },
            summary: {
                totalSpending: Number(totalSpending.toFixed(2)),
                avgDailySpending: Number(avgDailySpending.toFixed(2)),
                largestExpense: Number(largestExpense.toFixed(2)),
                transactionCount,
            },
            categories,
            prevCategories,
            prevSummary: {
                totalSpending: Number(prevTotalSpending.toFixed(2)),
            },
            timeSeries,
            topMerchants,
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return res.status(500).json({ error: "Unable to fetch analytics data." });
    }
};

export const getDashboardSummary = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const [income, expenses] = await Promise.all([
            prisma.transaction.aggregate({
                where: {
                    userId,
                    type: TransactionType.INCOME
                },
                _sum: {
                    amount: true
                }
            }),

            prisma.transaction.aggregate({
                where: {
                    userId,
                    type: TransactionType.EXPENSE
                },
                _sum: {
                    amount: true
                }
            })
        ]);

        const totalIncome = Number(income._sum.amount ?? 0);
        const totalExpenses = Number(expenses._sum.amount ?? 0);

        return res.status(200).json({
            totalIncome,
            totalExpenses,
            balance: totalIncome - totalExpenses
        });
    } catch (error) {
        console.error("Dashboard summary error:", error);

        return res.status(500).json({
            error: "Unable to fetch dashboard summary."
        });
    }
};

export const getCategoryBreakdown = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const categories = await prisma.transaction.groupBy({
            by: ["category"],
            where: {
                userId,
                type: TransactionType.EXPENSE
            },
            _sum: {
                amount: true
            },
            orderBy: {
                _sum: {
                    amount: "desc"
                }
            }
        });

        return res.status(200).json({
            categories: categories.map((item) => ({
                category: item.category,
                total: Number(item._sum.amount ?? 0)
            }))
        });
    } catch (error) {
        console.error("Category breakdown error:", error);

        return res.status(500).json({
            error: "Unable to fetch category breakdown."
        });
    }
};


export const getMonthlySummary = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        // Include the current month and previous 5 months.
        const now = new Date();
        const currentMonth = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
        );

        const startDate = new Date(
            Date.UTC(
                currentMonth.getUTCFullYear(),
                currentMonth.getUTCMonth() - 5,
                1
            )
        );

        const transactions = await prisma.transaction.findMany({
            where: {
                userId,
                date: {
                    gte: startDate,
                    lt: new Date(
                        Date.UTC(
                            currentMonth.getUTCFullYear(),
                            currentMonth.getUTCMonth() + 1,
                            1
                        )
                    )
                }
            },
            select: {
                amount: true,
                type: true,
                date: true
            }
        });

        const monthlyData = new Map<
            string,
            { income: number; expenses: number }
        >();

        // Initialize all six months, including months with no transactions.
        for (let i = 5; i >= 0; i--) {
            const date = new Date(
                Date.UTC(
                    currentMonth.getUTCFullYear(),
                    currentMonth.getUTCMonth() - i,
                    1
                )
            );

            const month = date.toISOString().slice(0, 7);

            monthlyData.set(month, {
                income: 0,
                expenses: 0
            });
        }

        for (const transaction of transactions) {
            const month = transaction.date.toISOString().slice(0, 7);
            const summary = monthlyData.get(month);

            if (!summary) continue;

            const amount = Number(transaction.amount);

            if (transaction.type === "INCOME") {
                summary.income += amount;
            } else if (transaction.type === "EXPENSE") {
                summary.expenses += amount;
            }
        }

        const monthlySummary = Array.from(
            monthlyData,
            ([month, summary]) => ({
                month,
                income: Number(summary.income.toFixed(2)),
                expenses: Number(summary.expenses.toFixed(2)),
                balance: Number(
                    (summary.income - summary.expenses).toFixed(2)
                )
            })
        );

        return res.status(200).json({ monthlySummary });
    } catch (error) {
        console.error("Monthly summary error:", error);

        return res.status(500).json({
            error: "Unable to fetch monthly summary."
        });
    }
};
