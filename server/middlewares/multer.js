const multer = require("multer");
const path = require("path");
const { r2, PutObjectCommand } = require("../config/cloud");

const STANDARD_EXTS = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'pptx', 'ppt', 'docx', 'doc', 'xls', 'xlsx', 'zip', 'apk'];
const CODE_EXTS = ['js', 'jsx', 'ts', 'tsx', 'py', 'sql', 'sh', 'bash', 'txt', 'md', 'json', 'css', 'html', 'c', 'cpp', 'h', 'java', 'rb', 'go', 'rs', 'php', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'gitignore'];

const fileFilter = (req, file, cb) => {
  const allowedExt = [...STANDARD_EXTS, ...CODE_EXTS];
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (!allowedExt.includes(ext)) {
    console.log('Rejected file extension:', ext);
    return cb(new Error('File type not allowed'), false);
  }
  cb(null, true);
};

const apkFileFilter = (req, file, cb) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (ext !== 'apk') {
    return cb(new Error('Only APK files are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter
});

/** Dedicated uploader for Android APKs (up to ~100 MB). */
const apkUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: apkFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Map type → directory (flat prefixes; courses uses hierarchical keys below)
const directoryMap = {
  assets: "Assets/",
  board_photos: "Board_Photos/",
  codes: "Codes/",
  events: "Events_Thumbnails/",
  images: "Images/",
  mobile: "Mobile Application/",
  slides: "Slides/",
  profile_pictures: "Profile_Pictures/",
  student_schedules: "Student_Schedules/"
};

/**
 * Build R2 object key.
 * Courses: Courses/{courseId}/thumbnail{ext} or Courses/{courseId}/lesson-{lessonId}/{unique}{ext}
 */
function buildObjectKey(type, file, query = {}) {
  const ext = path.extname(file.originalname);
  const unique = `${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;

  if (type === 'courses') {
    const courseId = query.course_id || query.courseId;
    if (!courseId || !/^\d+$/.test(String(courseId))) {
      const err = new Error('course_id is required for course uploads');
      err.status = 400;
      throw err;
    }
    const lessonId = query.lesson_id || query.lessonId;
    const kind = String(query.kind || '').toLowerCase();
    if (kind === 'thumbnail' || (!lessonId && kind !== 'material')) {
      return `Courses/${courseId}/thumbnail${ext}`;
    }
    if (!lessonId || !/^\d+$/.test(String(lessonId))) {
      const err = new Error('lesson_id is required for lesson material uploads');
      err.status = 400;
      throw err;
    }
    return `Courses/${courseId}/lesson-${lessonId}/${unique}`;
  }

  const dir = directoryMap[type];
  if (!dir) {
    const err = new Error('Invalid directory type');
    err.status = 400;
    throw err;
  }
  return `${dir}${unique}`;
}

const uploadFile = async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const key = buildObjectKey(type, file, req.query);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    const result = await r2.send(command);
    console.log(result);

    const publicURL = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;

    return res.json({
      success: true,
      url: publicURL,
      key,
      file_name: file.originalname
    });

  } catch (err) {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || "Upload failed", details: err.message });
  }
};

module.exports = {
  uploadFile,
  upload,
  apkUpload,
  buildObjectKey
};
