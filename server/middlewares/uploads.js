// this file is for setting up multer for file uploads
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) =>{
 cb(null, 'uploads/'); // specify the destination directory
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName); // specify the file name
    }

})

// Only allow PDFs or images (pizza filtering)
const fileFilter = (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
        cb(new Error("Only PDF or image files allowed"), false);
    } else {
        cb(null, true);
    }
};
const upload = multer({ 
     storage,
     fileFilter,
    limits:{
 fileSize: 50 * 1024 * 1024 // limit file size to 50MB
    } 

});

module.exports = upload;