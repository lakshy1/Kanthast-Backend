import express from "express";
import { auth, isAdmin } from "../middleware/Auth.js";
import {
  createChapter,
  createSubject,
  createVideo,
  deleteChapter,
  deleteSubject,
  deleteVideo,
  getMedicineUsmleContent,
  getMedicineUsmleVideoDetails,
  updateChapter,
  updateSubject,
  updateVideo,
  upsertMedicineUsmleContent,
} from "../controllers/MedicineUSMLE.js";

const router = express.Router();

router.get("/", getMedicineUsmleContent);
router.get("/video", getMedicineUsmleVideoDetails);
router.put("/admin", auth, isAdmin, upsertMedicineUsmleContent);
router.post("/admin/subjects", auth, isAdmin, createSubject);
router.patch("/admin/subjects/:subjectId", auth, isAdmin, updateSubject);
router.delete("/admin/subjects/:subjectId", auth, isAdmin, deleteSubject);
router.post("/admin/subjects/:subjectId/chapters", auth, isAdmin, createChapter);
router.patch("/admin/subjects/:subjectId/chapters/:chapterId", auth, isAdmin, updateChapter);
router.delete("/admin/subjects/:subjectId/chapters/:chapterId", auth, isAdmin, deleteChapter);
router.post("/admin/subjects/:subjectId/chapters/:chapterId/videos", auth, isAdmin, createVideo);
router.patch("/admin/subjects/:subjectId/chapters/:chapterId/videos/:videoId", auth, isAdmin, updateVideo);
router.delete("/admin/subjects/:subjectId/chapters/:chapterId/videos/:videoId", auth, isAdmin, deleteVideo);

export default router;
