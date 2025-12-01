const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const multer = require("multer");
const path = require("path");


// Only allow PDFs or images (pizza filtering)
const fileFilter = (req, file, cb) => {
  const allowedExt = ['pdf','jpg','jpeg','png','gif','ppt'];
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (!allowedExt.includes(ext)) {
    console.log('Rejected file extension:', ext);
    return cb(new Error('Only PDF, PowerPoint or image files allowed'), false);
  }
  cb(null, true);
};

const upload = multer({ storage: multer.memoryStorage(),
 fileFilter
 });

// R2 client
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

module.exports = upload;
module.exports.fileFilter = fileFilter;
