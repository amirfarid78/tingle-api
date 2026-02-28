const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Use memory storage — NO local /uploads folder needed ───────────────────
// Files are held as Buffer in req.file.buffer, then streamed to Cloudinary.
const storage = multer.memoryStorage();

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

/**
 * Upload a buffer (from memoryStorage) directly to Cloudinary via stream.
 * No disk write needed — works on any VPS without an uploads directory.
 *
 * @param {Buffer} buffer     - File buffer from req.file.buffer
 * @param {string} folder     - Cloudinary folder (e.g. 'tingle/videos')
 * @param {string} resourceType - 'image' | 'video' | 'auto'
 * @returns {Promise<string>} - Cloudinary secure_url
 */
const uploadBufferToCloudinary = (buffer, folder = 'tingle', resourceType = 'auto') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        // Convert buffer → readable stream and pipe into cloudinary
        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
};

/**
 * Backward-compatible wrapper: accepts either a file path (string) or
 * a Buffer so existing callers don't break.
 *
 * @param {string|Buffer} filePathOrBuffer
 * @param {string} folder
 * @param {string} resourceType
 */
const uploadToCloudinary = async (filePathOrBuffer, folder = 'tingle', resourceType = 'auto') => {
    if (Buffer.isBuffer(filePathOrBuffer)) {
        return uploadBufferToCloudinary(filePathOrBuffer, folder, resourceType);
    }
    // Legacy: caller passed a local file path (fallback for any remaining usage)
    const result = await cloudinary.uploader.upload(filePathOrBuffer, {
        folder,
        resource_type: resourceType,
    });
    return result.secure_url;
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

module.exports = { upload, uploadToCloudinary, uploadBufferToCloudinary, uploadMultipleToCloudinary, cloudinary };
