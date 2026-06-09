import { Router } from "express";
import { requireAuth, requirePermissions, requireRoles } from "../../../middlewares/auth";
import { listTransactions } from "../controllers/transaction.controller";

export const transactionRoutes = Router();

transactionRoutes.get(
  "/",
  requireAuth,
  requireRoles("user"),
  requirePermissions("transactions:read"),
  listTransactions,
);
