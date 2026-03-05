import express from "express";
import { auth, isAdmin } from "../middleware/Auth.js";
import {
  getMedicineUsmleContent,
  getMedicineUsmleVideoDetails,
  upsertMedicineUsmleContent,
} from "../controllers/MedicineUSMLE.js";

const router = express.Router();

router.get("/", getMedicineUsmleContent);
router.get("/video", getMedicineUsmleVideoDetails);
router.put("/admin", auth, isAdmin, upsertMedicineUsmleContent);

export default router;
