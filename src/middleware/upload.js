const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fs = require('fs');
const path = require('path');

// ─── Use disk storage to prevent OOM on large videos ─────────────────────────
// Files are saved to a temporary folder and then streamed to Cloudinary, then deleted.
const tempDir = path.join(__dirname, '../../temp_uploads');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideo = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac'];

    if ([...allowedImage, ...allowedVideo, ...allowedAudio].includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type not supported: ${file.mimetype}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 } // 100MB
});

// Since we moved to diskStorage, we don't need uploadBufferToCloudinary anymore.
// We will modify the standard uploadToCloudinary to accept the file path and delete it after.
const uploadToCloudinary = async (filePathOrBuffer, folder = 'tingle', resourceType = 'auto') => {
    if (Buffer.isBuffer(filePathOrBuffer)) {
        // Fallback for any legacy memory buffer code
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder, resource_type: resourceType },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                }
            );
            const readable = new Readable();
            readable.push(filePathOrBuffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }

    try {
        // Normal disk upload
        const result = await cloudinary.uploader.upload(filePathOrBuffer, {
            folder,
            resource_type: resourceType,
        });

        // Delete local temp file after success
        if (fs.existsSync(filePathOrBuffer)) {
            fs.unlinkSync(filePathOrBuffer);
        }

        return result.secure_url;
    } catch (error) {
        // Ensure cleanup even on error
        if (fs.existsSync(filePathOrBuffer)) {
            fs.unlinkSync(filePathOrBuffer);
        }
        throw error;
    }
};

/**
 * Upload multiple files (array of req.file objects or file paths).
 */
const uploadMultipleToCloudinary = async (files, folder = 'tingle') => {
    const urls = [];
    for (const file of files) {
        // Support both memoryStorage objects ({buffer}) and diskStorage objects ({path})
        const source = file.buffer || file.path;
        const url = await uploadToCloudinary(source, folder);
        urls.push(url);
    }
    return urls;
};

module.exports = { upload, uploadToCloudinary, uploadMultipleToCloudinary, cloudinary };
