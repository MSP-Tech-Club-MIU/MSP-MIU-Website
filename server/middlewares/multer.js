// this file is for setting up multer for file uploads
const multer = require('multer');
const path = require('path');


// Only allow PDFs or images (pizza filtering)
const fileFilter = (req, file, cb) => {
  const allowedExt = ['pdf','jpg','jpeg','png','gif','ppt','pptx'];
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (!allowedExt.includes(ext)) {
    console.log('Rejected file extension:', ext);
    return cb(new Error('Only PDF, PowerPoint or image files allowed'), false);
  }
  cb(null, true);
};

const upload = multer({ 
     fileFilter,
    limits:{
 fileSize: 50 * 1024 * 1024 // limit file size to 50MB
    } 

});

module.exports = upload;
module.exports.fileFilter = fileFilter;