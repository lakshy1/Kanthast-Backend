import MedicineUSMLE from "../models/MedicineUSMLE.js";

const DEFAULT_SUBJECTS = [
  "Biochemistry",
  "Immunology",
  "Pharmacology",
  "Microbiology",
  "Neuroanatomy",
];

const normalizeMedia = (media = []) =>
  Array.isArray(media)
    ? media.map((item) => ({
        imageLink: String(item?.imageLink || "").trim(),
        imageText: String(item?.imageText || "").trim(),
      }))
    : [];

const normalizeVideos = (videos = []) =>
  Array.isArray(videos)
    ? videos.map((video, index) => ({
        _id: video?._id,
        name: String(video?.name || "").trim(),
        duration: String(video?.duration || "--:--").trim(),
        summary: String(video?.summary || "").trim(),
        videoLink: String(video?.videoLink || "").trim(),
        photos: normalizeMedia(video?.photos || []),
        order: Number.isFinite(Number(video?.order)) ? Number(video.order) : index,
      }))
    : [];

const normalizeChapters = (chapters = []) =>
  Array.isArray(chapters)
    ? chapters.map((chapter, index) => ({
        _id: chapter?._id,
        name: String(chapter?.name || "").trim(),
        totalDuration: String(chapter?.totalDuration || "--:--").trim(),
        order: Number.isFinite(Number(chapter?.order)) ? Number(chapter.order) : index,
        videos: normalizeVideos(chapter?.videos || []),
      }))
    : [];

const normalizeSubjects = (subjects = []) =>
  Array.isArray(subjects)
    ? subjects.map((subject, index) => ({
        _id: subject?._id,
        name: String(subject?.name || "").trim(),
        totalDuration: String(subject?.totalDuration || "--:--").trim(),
        order: Number.isFinite(Number(subject?.order)) ? Number(subject.order) : index,
        chapters: normalizeChapters(subject?.chapters || []),
      }))
    : [];

const validatePayload = (payload) => {
  const subjects = normalizeSubjects(payload?.subjects || []);

  if (!subjects.length) {
    throw new Error("At least one subject is required");
  }

  for (const subject of subjects) {
    if (!subject.name) {
      throw new Error("Every subject must have a name");
    }

    for (const chapter of subject.chapters) {
      if (!chapter.name) {
        throw new Error(`Subject \"${subject.name}\" has a chapter without a name`);
      }

      for (const video of chapter.videos) {
        if (!video.name) {
          throw new Error(
            `Subject \"${subject.name}\" chapter \"${chapter.name}\" has a video without a name`
          );
        }
      }
    }
  }

  return {
    courseTitle: String(payload?.courseTitle || "Medicine/USMLE").trim() || "Medicine/USMLE",
    subjects,
  };
};

const getOrCreateMedicineUsmle = async () => {
  let content = await MedicineUSMLE.findOne({ courseKey: "medicine-usmle" });
  if (content) return content;

  content = await MedicineUSMLE.create({
    courseKey: "medicine-usmle",
    courseTitle: "Medicine/USMLE",
    subjects: DEFAULT_SUBJECTS.map((name, index) => ({
      name,
      totalDuration: "--:--",
      order: index,
      chapters: [],
    })),
  });

  return content;
};

const sortHierarchy = (content) => {
  const cloned = content.toObject ? content.toObject() : content;

  const subjects = [...(cloned.subjects || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  const normalized = subjects.map((subject) => ({
    ...subject,
    chapters: [...(subject.chapters || [])]
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((chapter) => ({
        ...chapter,
        videos: [...(chapter.videos || [])].sort((a, b) => (a.order || 0) - (b.order || 0)),
      })),
  }));

  return {
    ...cloned,
    subjects: normalized,
  };
};

export const getMedicineUsmleContent = async (req, res) => {
  try {
    const content = await getOrCreateMedicineUsmle();

    return res.status(200).json({
      success: true,
      content: sortHierarchy(content),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMedicineUsmleVideoDetails = async (req, res) => {
  try {
    const { subjectId, chapterId, videoId } = req.query;

    if (!subjectId || !chapterId || !videoId) {
      return res.status(400).json({
        success: false,
        message: "subjectId, chapterId and videoId are required",
      });
    }

    const content = await getOrCreateMedicineUsmle();

    const subject = content.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    const video = chapter.videos.id(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    return res.status(200).json({
      success: true,
      video: {
        ...video.toObject(),
        subject: {
          _id: subject._id,
          name: subject.name,
          totalDuration: subject.totalDuration,
        },
        chapter: {
          _id: chapter._id,
          name: chapter.name,
          totalDuration: chapter.totalDuration,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const upsertMedicineUsmleContent = async (req, res) => {
  try {
    const { courseTitle, subjects } = validatePayload(req.body || {});

    const updated = await MedicineUSMLE.findOneAndUpdate(
      { courseKey: "medicine-usmle" },
      {
        courseKey: "medicine-usmle",
        courseTitle,
        subjects,
        updatedBy: req.user?._id || null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Medicine/USMLE content updated successfully",
      content: sortHierarchy(updated),
    });
  } catch (error) {
    const statusCode = error.message?.includes("required") || error.message?.includes("must") ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getMedicineDocument = async () => {
  const doc = await getOrCreateMedicineUsmle();
  return doc;
};

export const createSubject = async (req, res) => {
  try {
    const { name, totalDuration = "--:--" } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Subject name is required" });
    }

    const doc = await getMedicineDocument();
    doc.subjects.push({
      name: name.trim(),
      totalDuration: String(totalDuration || "--:--").trim(),
      order: doc.subjects.length,
      chapters: [],
    });
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(201).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, totalDuration, order } = req.body || {};

    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    if (name !== undefined) subject.name = String(name).trim();
    if (totalDuration !== undefined) subject.totalDuration = String(totalDuration).trim() || "--:--";
    if (order !== undefined && Number.isFinite(Number(order))) subject.order = Number(order);
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(200).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    subject.deleteOne();
    doc.subjects.forEach((item, index) => {
      item.order = index;
    });
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(200).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createChapter = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, totalDuration = "--:--" } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Chapter name is required" });
    }

    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    subject.chapters.push({
      name: name.trim(),
      totalDuration: String(totalDuration || "--:--").trim(),
      order: subject.chapters.length,
      videos: [],
    });
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(201).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateChapter = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const { name, totalDuration, order } = req.body || {};

    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    if (name !== undefined) chapter.name = String(name).trim();
    if (totalDuration !== undefined) chapter.totalDuration = String(totalDuration).trim() || "--:--";
    if (order !== undefined && Number.isFinite(Number(order))) chapter.order = Number(order);
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(200).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteChapter = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    chapter.deleteOne();
    subject.chapters.forEach((item, index) => {
      item.order = index;
    });
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(200).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createVideo = async (req, res) => {
  try {
    const { subjectId, chapterId } = req.params;
    const { name, duration = "--:--", summary = "", videoLink = "", photos = [] } = req.body || {};
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: "Video name is required" });
    }

    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }

    chapter.videos.push({
      name: name.trim(),
      duration: String(duration || "--:--").trim(),
      summary: String(summary || "").trim(),
      videoLink: String(videoLink || "").trim(),
      photos: normalizeMedia(photos),
      order: chapter.videos.length,
    });
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(201).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateVideo = async (req, res) => {
  try {
    const { subjectId, chapterId, videoId } = req.params;
    const { name, duration, summary, videoLink, photos, order } = req.body || {};

    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }
    const video = chapter.videos.id(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    if (name !== undefined) video.name = String(name).trim();
    if (duration !== undefined) video.duration = String(duration).trim() || "--:--";
    if (summary !== undefined) video.summary = String(summary).trim();
    if (videoLink !== undefined) video.videoLink = String(videoLink).trim();
    if (photos !== undefined) video.photos = normalizeMedia(photos);
    if (order !== undefined && Number.isFinite(Number(order))) video.order = Number(order);
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(200).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteVideo = async (req, res) => {
  try {
    const { subjectId, chapterId, videoId } = req.params;
    const doc = await getMedicineDocument();
    const subject = doc.subjects.id(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    const chapter = subject.chapters.id(chapterId);
    if (!chapter) {
      return res.status(404).json({ success: false, message: "Chapter not found" });
    }
    const video = chapter.videos.id(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: "Video not found" });
    }

    video.deleteOne();
    chapter.videos.forEach((item, index) => {
      item.order = index;
    });
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    return res.status(200).json({ success: true, content: sortHierarchy(doc) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
