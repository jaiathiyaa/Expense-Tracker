import express from "express";
import cors from "cors";
import transactionRoutes from "./routes/transactions.route";
import userRoutes from "./routes/user.route";
import authRoutes from "./routes/auth.route";
import dashboardRouter from "./routes/dashboard.route";

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', transactionRoutes);
app.use('/api', userRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Expense Tracker API is running!" });
});



export default app;