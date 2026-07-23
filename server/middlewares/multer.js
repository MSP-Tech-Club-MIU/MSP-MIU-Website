const multer = require("multer");
const path = require("path");
const {r2, PutObjectCommand} = require("../config/cloud");

// Only allow PDFs, office docs, images, zip, or Android APK
const fileFilter = (req, file, cb) => {
  const allowedExt = ['pdf','jpg','jpeg','png','gif','pptx','ppt','docx','doc','xls','xlsx', 'zip', 'apk'];
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (!allowedExt.includes(ext)) {
    console.log('Rejected file extension:', ext);
    return cb(new Error('Only PDF, PowerPoint, Word, Excel, image, ZIP, or APK files allowed'), false);
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

const upload = multer({ storage: multer.memoryStorage(),
 fileFilter
 });

/** Dedicated uploader for Android APKs (up to ~100 MB). */
const apkUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: apkFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Map type → directory
const directoryMap = {
  assets: "Assets/",
  codes: "Codes/",
  events: "Events_Thumbnails/",
  images: "Images/",
  mobile: "Mobile Application/",
  slides: "Slides/",
  profile_pictures: "Profile_Pictures/",
  student_schedules: "Student_Schedules/"
};

// Upload handler
const uploadFile = async (req, res) => {
  try {
    const { type } = req.params; // assets, codes, events, etc.
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const dir = directoryMap[type.toLowerCase()];
    if (!dir) return res.status(400).json({ error: "Invalid directory type" });

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2)}${ext}`;
    const key = `${dir}${unique}`;

    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    });
    const result = await r2.send(command);
    console.log(result);

    // Public URL
    const publicURL = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;

    return res.json({
      success: true,
      url: publicURL,
      key
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
};




// Export multer middleware
const multerUpload = upload.single("file");

module.exports = {
  uploadFile,
  upload,
  apkUpload
};