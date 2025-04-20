import { Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as ocrModel from '../services/ocrModel';

// Define directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for storing training data
const TRAINING_DATA_DIR = path.join(__dirname, '../../ocr-training-data');

// Ensure training data directory exists
if (!fs.existsSync(TRAINING_DATA_DIR)) {
  fs.mkdirSync(TRAINING_DATA_DIR, { recursive: true });
}

/**
 * Initialize the OCR model
 */
export async function initializeModel(req: Request, res: Response) {
  try {
    await ocrModel.initializeModel();
    const modelInfo = await ocrModel.getModelInfo();
    res.status(200).json({
      message: 'OCR model initialized successfully',
      modelInfo
    });
  } catch (error: any) {
    console.error('Error initializing OCR model:', error);
    res.status(500).json({
      message: 'Failed to initialize OCR model',
      error: error?.message || 'Unknown error'
    });
  }
}

/**
 * Get model info
 */
export async function getModelInfo(req: Request, res: Response) {
  try {
    const modelInfo = await ocrModel.getModelInfo();
    res.status(200).json({
      message: 'OCR model info retrieved',
      modelInfo
    });
  } catch (error) {
    console.error('Error getting model info:', error);
    res.status(500).json({
      message: 'Failed to get model info',
      error: error.message
    });
  }
}

/**
 * Upload and store training image
 */
export async function uploadTrainingImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No image file provided'
      });
    }
    
    const { label } = req.body;
    
    if (!label) {
      return res.status(400).json({
        message: 'No label provided for training image'
      });
    }
    
    // Generate a unique ID for this training example
    const id = Date.now().toString();
    const uniqueFilename = `${id}_${label.replace(/[^a-z0-9]/gi, '_')}.png`;
    const finalPath = path.join(TRAINING_DATA_DIR, uniqueFilename);
    
    // Move the uploaded file
    fs.renameSync(req.file.path, finalPath);
    
    res.status(200).json({
      message: 'Training image uploaded successfully',
      id,
      filename: uniqueFilename,
      label
    });
  } catch (error) {
    console.error('Error uploading training image:', error);
    res.status(500).json({
      message: 'Failed to upload training image',
      error: error.message
    });
  }
}

/**
 * Train model with uploaded image 
 */
export async function trainWithImage(req: Request, res: Response) {
  try {
    const { imageId, label } = req.body;
    
    if (!imageId || !label) {
      return res.status(400).json({
        message: 'Image ID and label are required'
      });
    }
    
    // Find the image file
    const files = fs.readdirSync(TRAINING_DATA_DIR);
    const targetFile = files.find(file => file.startsWith(`${imageId}_`));
    
    if (!targetFile) {
      return res.status(404).json({
        message: 'Training image not found'
      });
    }
    
    const imagePath = path.join(TRAINING_DATA_DIR, targetFile);
    
    // Train the model with this example
    await ocrModel.updateModelWithExample(imagePath, label);
    
    res.status(200).json({
      message: 'Model updated successfully with new training example',
      imageId,
      label
    });
  } catch (error) {
    console.error('Error training model:', error);
    res.status(500).json({
      message: 'Failed to train model',
      error: error.message
    });
  }
}

/**
 * Upload canvas and recognize text 
 */
export async function recognizeFromCanvas(req: Request, res: Response) {
  try {
    const { canvasData } = req.body;
    
    if (!canvasData || !canvasData.startsWith('data:image')) {
      return res.status(400).json({
        message: 'Valid canvas data is required'
      });
    }
    
    // Process with our model
    const recognizedText = await ocrModel.recognizeTextFromCanvas(canvasData);
    
    res.status(200).json({
      message: 'Text recognition completed',
      text: recognizedText
    });
  } catch (error) {
    console.error('Error recognizing text:', error);
    res.status(500).json({
      message: 'Failed to recognize text',
      error: error.message
    });
  }
}

/**
 * Train on a batch of training images
 */
export async function trainBatch(req: Request, res: Response) {
  try {
    const { trainingData } = req.body;
    
    if (!trainingData || !Array.isArray(trainingData) || trainingData.length === 0) {
      return res.status(400).json({
        message: 'Valid training data array is required'
      });
    }
    
    // Prepare image paths and labels
    const imagePaths: string[] = [];
    const labels: string[] = [];
    
    // Validate all entries first
    for (const item of trainingData) {
      if (!item.imageId || !item.label) {
        return res.status(400).json({
          message: 'Each training item requires imageId and label',
          invalidItem: item
        });
      }
      
      // Find the image file
      const files = fs.readdirSync(TRAINING_DATA_DIR);
      const targetFile = files.find(file => file.startsWith(`${item.imageId}_`));
      
      if (!targetFile) {
        return res.status(404).json({
          message: 'Training image not found',
          missingImageId: item.imageId
        });
      }
      
      imagePaths.push(path.join(TRAINING_DATA_DIR, targetFile));
      labels.push(item.label);
    }
    
    // Train on the batch
    await ocrModel.trainOnBatch(imagePaths, labels);
    
    res.status(200).json({
      message: `Model trained successfully on batch of ${trainingData.length} examples`,
      trainingCount: trainingData.length
    });
  } catch (error) {
    console.error('Error training batch:', error);
    res.status(500).json({
      message: 'Failed to train on batch',
      error: error.message
    });
  }
}

/**
 * Get list of all training images
 */
export async function getTrainingImages(req: Request, res: Response) {
  try {
    const files = fs.readdirSync(TRAINING_DATA_DIR);
    
    const trainingImages = files.map(filename => {
      // Parse the filename to extract ID and label
      const match = filename.match(/^(\d+)_(.+)\.png$/);
      if (match) {
        return {
          id: match[1],
          label: match[2].replace(/_/g, ' ').trim(),
          filename,
          path: `/api/ocr/training-image/${filename}`
        };
      }
      return null;
    }).filter(Boolean);
    
    res.status(200).json({
      message: 'Training images retrieved successfully',
      count: trainingImages.length,
      trainingImages
    });
  } catch (error) {
    console.error('Error getting training images:', error);
    res.status(500).json({
      message: 'Failed to get training images',
      error: error.message
    });
  }
}

/**
 * Serve a training image
 */
export async function getTrainingImage(req: Request, res: Response) {
  try {
    const { filename } = req.params;
    const imagePath = path.join(TRAINING_DATA_DIR, filename);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        message: 'Training image not found'
      });
    }
    
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving training image:', error);
    res.status(500).json({
      message: 'Failed to serve training image',
      error: error.message
    });
  }
}

/**
 * Delete a training image
 */
export async function deleteTrainingImage(req: Request, res: Response) {
  try {
    const { imageId } = req.params;
    
    // Find the image file
    const files = fs.readdirSync(TRAINING_DATA_DIR);
    const targetFile = files.find(file => file.startsWith(`${imageId}_`));
    
    if (!targetFile) {
      return res.status(404).json({
        message: 'Training image not found'
      });
    }
    
    const imagePath = path.join(TRAINING_DATA_DIR, targetFile);
    
    // Delete the file
    fs.unlinkSync(imagePath);
    
    res.status(200).json({
      message: 'Training image deleted successfully',
      imageId
    });
  } catch (error) {
    console.error('Error deleting training image:', error);
    res.status(500).json({
      message: 'Failed to delete training image',
      error: error.message
    });
  }
}