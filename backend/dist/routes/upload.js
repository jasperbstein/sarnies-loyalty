"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(__dirname, '../../uploads');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure Multer for disk storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, 'upload-' + uniqueSuffix + ext);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.'));
        }
    },
});
// POST /api/upload - Upload image locally
router.post('/', auth_1.authenticate, auth_1.requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Return the URL path to access the file
        const url = `${process.env.BACKEND_URL || 'http://localhost:3000'}/uploads/${req.file.filename}`;
        res.json({
            url,
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
        });
    }
    catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload image' });
    }
});
// DELETE /api/upload/:filename - Delete local image
router.delete('/:filename', auth_1.authenticate, auth_1.requireAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }
        // Security: prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        const filePath = path_1.default.join(uploadsDir, filename);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Image not found' });
        }
        // Delete the file
        fs_1.default.unlinkSync(filePath);
        res.json({ message: 'Image deleted successfully' });
    }
    catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete image' });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map