const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration (local)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideo = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac'];

    if ([...allowedImage, ...allowedVideo, ...allowedAudio].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 } // 50MB
});

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (filePath, folder = 'tingle', resourceType = 'auto') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
            resource_type: resourceType,
        });
        // Clean up local file
        fs.unlink(filePath, () => { });
        return result.secure_url;
    } catch (error) {
        // If Cloudinary fails, return local path
        console.warn('Cloudinary upload failed, using local storage:', error.message);
        return `/uploads/${path.basename(filePath)}`;
    }
};

/**
 * Upload multiple files
 */
const uploadMultipleToCloudinary = async (files, folder = 'tingle') => {
    const urls = [];
    for (const file of files) {
        const url = await uploadToCloudinary(file.path, folder);
        urls.push(url);
    }
    return urls;
};

module.exports = { upload, uploadToCloudinary, uploadMultipleToCloudinary, cloudinary };
