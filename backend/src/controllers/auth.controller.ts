
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return secret;
};

// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            password.length < 8
        ) {
            return res.status(400).json({
                error: "Name and email are required. Password must be at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (existingUser) {
            return res.status(409).json({
                error: "User with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                password: hashedPassword
            },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
            }
        });

        return res.status(201).json({
            message: "User registered successfully.",
            user
        });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            error: "Internal server error."
        });
    }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                email: email.trim().toLowerCase()
            }
        });

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            getJwtSecret(),
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            error: "Internal server error."
        });
    }
};


export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                error: "Authentication required."
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found."
            });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error("Get current user error:", error);

        return res.status(500).json({
            error: "Internal server error."
        });
    }
};

// PUT /api/auth/profile
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const { name, email } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({ error: "Name is required and cannot be empty." });
        }

        const updateData: { name: string; email?: string } = {
            name: name.trim()
        };

        if (email !== undefined) {
            if (typeof email !== "string" || !email.trim()) {
                return res.status(400).json({ error: "Email cannot be empty." });
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const normalizedEmail = email.trim().toLowerCase();

            if (!emailRegex.test(normalizedEmail)) {
                return res.status(400).json({ error: "Please enter a valid email address." });
            }

            // Check if another user already has this email
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedEmail }
            });

            if (existingUser && existingUser.id !== userId) {
                return res.status(409).json({ error: "Email is already in use by another account." });
            }

            updateData.email = normalizedEmail;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: updatedUser
        });
    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

// PUT /api/auth/change-password
export const changePassword = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const { currentPassword, newPassword } = req.body;

        if (
            typeof currentPassword !== "string" ||
            !currentPassword ||
            typeof newPassword !== "string" ||
            !newPassword
        ) {
            return res.status(400).json({
                error: "Both current password and new password are required."
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                error: "New password must be at least 8 characters long."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                error: "New password must be different from current password."
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const passwordMatches = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatches) {
            return res.status(400).json({ error: "Current password is incorrect." });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        return res.status(200).json({
            message: "Password changed successfully."
        });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};

// DELETE /api/auth/account
export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required." });
        }

        const { password } = req.body;
        if (typeof password !== "string" || !password) {
            return res.status(400).json({
                error: "Please enter your password to confirm account deletion."
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(400).json({
                error: "Incorrect password. Account was not deleted."
            });
        }

        // Transactions cascade delete automatically according to Prisma schema
        await prisma.user.delete({
            where: { id: userId }
        });

        return res.status(200).json({
            message: "Account and associated data deleted successfully."
        });
    } catch (error) {
        console.error("Delete account error:", error);
        return res.status(500).json({ error: "Internal server error." });
    }
};
