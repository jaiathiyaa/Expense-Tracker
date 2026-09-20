import express from "express";
import cors from "cors";
import transactionRoutes from "./routes/transactions.route";

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', transactionRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Expense Tracker API is running!" });
});



export default app;