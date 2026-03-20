import { Router } from "express";
import { listUsers, lookupByUserId } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", authMiddleware, listUsers);
router.get("/lookup/:userId", lookupByUserId);

export default router;