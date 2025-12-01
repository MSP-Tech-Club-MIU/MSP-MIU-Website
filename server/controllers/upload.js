const multer = require("multer");
const path = require("path");
const { r2, PutObjectCommand } = require("../config/cloud");
const { fileFilter } = require("../middlewares/multer");
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // limit file size to 50MB
    }
});

// Map type → directory
const directoryMap = {
  assets: "Assets/",
  codes: "Codes/",
  events: "Events_Thumbnails/",
  images: "Images/",
  mobile: "Mobile Application/",
  slides: "Slides/"
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

    // Upload to R2
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
  multerUpload
};
