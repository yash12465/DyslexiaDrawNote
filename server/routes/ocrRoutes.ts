import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as ocrController from '../controllers/ocrController';

// Define directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

const router = Router();

// OCR model management routes
router.post('/initialize', ocrController.initializeModel);
router.get('/status', ocrController.getModelInfo);

// Training data management routes
router.post('/upload-training', upload.single('image'), ocrController.uploadTrainingImage);
router.post('/train', ocrController.trainWithImage);
router.post('/train-batch', ocrController.trainBatch);
router.get('/training-images', ocrController.getTrainingImages);
router.get('/training-image/:filename', ocrController.getTrainingImage);
router.delete('/training-image/:imageId', ocrController.deleteTrainingImage);

// Recognition routes
router.post('/recognize', ocrController.recognizeFromCanvas);

export default router;