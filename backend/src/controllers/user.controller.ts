import {prisma} from "../lib/prisma";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

export const createUser = async (req:Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: "User with this email already exists." });
        }

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password
            }
        });

        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUserId = req.user?.id;

        if (!authUserId) {
            return res.status(401).json({ error: "Authentication required." });
        }

        if (authUserId !== String(id)) {
            return res.status(403).json({ error: "Access denied. Cannot view other user accounts." });
        }

        const user = await prisma.user.findUnique({
            where: { id: String(id) },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error." });
    }
};

export const updateUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const authUserId = req.user?.id;

        if (!authUserId) {
            return res.status(401).json({ error: "Authentication required." });
        }

        if (authUserId !== String(id)) {
            return res.status(403).json({ error: "Access denied. Cannot modify other user accounts." });
        }

        const { name, email } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Name is required." });
        }

        const updateData: { name: string; email?: string } = {
            name: name.trim()
        };

        if (email !== undefined) {
            if (typeof email !== "string" || !email.trim()) {
                return res.status(400).json({ error: "Email cannot be empty." });
            }
            updateData.email = email.trim().toLowerCase();
        }

        const updatedUser = await prisma.user.update({
            where: { id: String(id) },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            if (error.code === "P2025") {
                return res.status(404).json({
                    error: "User not found."
                });
            }

            if (error.code === "P2002") {
                return res.status(409).json({
                    error: "Email is already in use."
                });
            }
        }
        console.error(error);
        res.status(500).json({ error: "Internal server error." });
    }
}
