import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as ocrController from '../controllers/ocrController';

// Configure storage for training images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads/training');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const fileExt = path.extname(file.originalname);
    cb(null, `${uuidv4()}${fileExt}`);
  }
});

// Set up multer upload
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

// OCR model routes
router.post('/initialize', ocrController.initializeModel);
router.get('/status', ocrController.getModelInfo);

// Training image routes
router.post('/upload-training', upload.single('image'), ocrController.uploadTrainingImage);
router.post('/train', ocrController.trainWithImage);
router.post('/train-batch', ocrController.trainBatch);
router.get('/training-images', ocrController.getTrainingImages);
router.get('/training-image/:id', ocrController.getTrainingImage);
router.delete('/training-image/:id', ocrController.deleteTrainingImage);

// Recognition route
router.post('/recognize', upload.single('image'), ocrController.recognizeFromCanvas);

export default router;