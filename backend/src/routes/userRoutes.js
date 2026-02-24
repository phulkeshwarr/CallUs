import { Router } from "express";
import { listUsers } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authMiddleware, listUsers);

export default router;