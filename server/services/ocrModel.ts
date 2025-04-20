import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

// Define directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the model path
const MODEL_DIR = path.join(__dirname, '../../ocr-model');
const MODEL_PATH = `file://${path.join(MODEL_DIR, 'model.json')}`;

// Ensure model directory exists
if (!fs.existsSync(MODEL_DIR)) {
  fs.mkdirSync(MODEL_DIR, { recursive: true });
}

// Character set for dyslexic handwriting recognition
const CHAR_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!\'"-_:;() ';
const NUM_CLASSES = CHAR_SET.length;

// Training parameters
const BATCH_SIZE = 32;
const EPOCHS = 10;
const IMAGE_WIDTH = 28;
const IMAGE_HEIGHT = 28;

// Store model globally
let model: tf.LayersModel | null = null;

/**
 * Create a new model for dyslexic handwriting recognition
 */
export async function createModel(): Promise<tf.LayersModel> {
  // Create a sequential model
  const model = tf.sequential();
  
  // First convolutional layer
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_HEIGHT, IMAGE_WIDTH, 1],
    kernelSize: 3,
    filters: 32,
    strides: 1,
    activation: 'relu',
    kernelInitializer: 'varianceScaling'
  }));
  
  // Max pooling
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  
  // Second convolutional layer
  model.add(tf.layers.conv2d({
    kernelSize: 3,
    filters: 64,
    strides: 1,
    activation: 'relu',
    kernelInitializer: 'varianceScaling'
  }));
  
  // Another max pooling
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2], strides: [2, 2] }));
  
  // Flatten and dense layers
  model.add(tf.layers.flatten());
  
  // Dense hidden layer
  model.add(tf.layers.dense({
    units: 128,
    kernelInitializer: 'varianceScaling',
    activation: 'relu'
  }));
  
  // Dropout to prevent overfitting
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  // Output layer
  model.add(tf.layers.dense({
    units: NUM_CLASSES,
    kernelInitializer: 'varianceScaling',
    activation: 'softmax'
  }));
  
  // Compile the model
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
}

/**
 * Initialize the OCR model - create new or load existing
 */
export async function initializeModel(): Promise<tf.LayersModel> {
  try {
    // Check if model exists
    if (fs.existsSync(path.join(MODEL_DIR, 'model.json'))) {
      console.log('Loading existing OCR model...');
      model = await tf.loadLayersModel(MODEL_PATH);
      console.log('Model loaded successfully');
    } else {
      console.log('Creating new OCR model...');
      model = await createModel();
      // Save the model
      await model.save(MODEL_PATH);
      console.log('New model created and saved');
    }
    
    return model;
  } catch (error) {
    console.error('Error initializing model:', error);
    // If loading fails, create a new model
    console.log('Falling back to creating a new model...');
    model = await createModel();
    await model.save(MODEL_PATH);
    return model;
  }
}

/**
 * Preprocess image for training or prediction
 */
export async function preprocessImage(imagePath: string): Promise<tf.Tensor4D> {
  try {
    // Read and process the image with sharp
    const processedImageBuffer = await sharp(imagePath)
      // Convert to grayscale
      .grayscale()
      // Increase contrast (equivalent to contrast of 0.2 in Jimp)
      .linear(1.2, -0.1) 
      // Resize to our model dimensions
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT)
      // Output as jpeg
      .toFormat('jpeg')
      .toBuffer();
    
    // Convert to tensor
    const imageTensor = tf.node.decodeImage(processedImageBuffer, 1);
    
    // Normalize pixel values to [0, 1]
    const normalized = imageTensor.div(tf.scalar(255));
    
    // Reshape to match model input
    return normalized.expandDims(0) as tf.Tensor4D;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw new Error('Failed to preprocess image');
  }
}

/**
 * Process canvas for prediction
 */
export async function preprocessCanvas(canvasDataUrl: string): Promise<tf.Tensor4D> {
  try {
    // Convert data URL to buffer
    const base64Data = canvasDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Process directly with sharp without saving to disk
    const processedImageBuffer = await sharp(buffer)
      // Convert to grayscale
      .grayscale()
      // Increase contrast (equivalent to contrast of 0.2 in Jimp)
      .linear(1.2, -0.1) 
      // Resize to our model dimensions
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT)
      // Output as jpeg
      .toFormat('jpeg')
      .toBuffer();
    
    // Convert to tensor
    const imageTensor = tf.node.decodeImage(processedImageBuffer, 1);
    
    // Normalize pixel values to [0, 1]
    const normalized = imageTensor.div(tf.scalar(255));
    
    // Reshape to match model input
    return normalized.expandDims(0) as tf.Tensor4D;
  } catch (error) {
    console.error('Error preprocessing canvas:', error);
    throw new Error('Failed to preprocess canvas');
  }
}

/**
 * Train model on a batch of labeled images
 */
export async function trainOnBatch(
  imagePaths: string[], 
  labels: string[]
): Promise<any> {
  if (!model) {
    model = await initializeModel();
  }
  
  if (imagePaths.length !== labels.length) {
    throw new Error('Number of images does not match number of labels');
  }
  
  console.log(`Training on batch of ${imagePaths.length} images...`);
  
  // Process images and prepare tensors
  const imagePromises = imagePaths.map(path => preprocessImage(path));
  const imageTensors = await Promise.all(imagePromises);
  
  // Stack all image tensors
  const xs = tf.concat(imageTensors);
  
  // Prepare one-hot encoded labels
  const labelIndices = labels.map(label => {
    // Handle multi-character labels by using the first character
    const char = label.charAt(0);
    return CHAR_SET.indexOf(char);
  }).filter(index => index !== -1); // Remove any characters not in our set
  
  const ys = tf.oneHot(tf.tensor1d(labelIndices, 'int32'), NUM_CLASSES);
  
  // Train the model
  const result = await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        console.log(`Epoch ${epoch + 1} of ${EPOCHS}, loss: ${logs?.loss.toFixed(4)}, accuracy: ${logs?.acc.toFixed(4)}`);
      }
    }
  });
  
  // Save the updated model
  await model.save(MODEL_PATH);
  console.log('Model updated and saved');
  
  // Clean up tensors
  tf.dispose([xs, ys, ...imageTensors]);
  
  return result;
}

/**
 * Update model with a single labeled example
 */
export async function updateModelWithExample(
  imagePath: string, 
  label: string
): Promise<any> {
  return trainOnBatch([imagePath], [label]);
}

/**
 * Recognize text from image
 */
export async function recognizeText(imageTensor: tf.Tensor4D): Promise<string> {
  if (!model) {
    model = await initializeModel();
  }
  
  // Get prediction
  const prediction = model.predict(imageTensor) as tf.Tensor2D;
  
  // Get indices with highest probability
  const indices = tf.argMax(prediction, 1).dataSync();
  
  // Map indices to characters
  let text = '';
  for (let i = 0; i < indices.length; i++) {
    text += CHAR_SET[indices[i]];
  }
  
  // Clean up tensors
  tf.dispose([prediction]);
  
  return text;
}

/**
 * Recognize text from canvas data URL
 */
export async function recognizeTextFromCanvas(canvasDataUrl: string): Promise<string> {
  const tensor = await preprocessCanvas(canvasDataUrl);
  const text = await recognizeText(tensor);
  tf.dispose(tensor);
  return text;
}

/**
 * Get model information
 */
export async function getModelInfo(): Promise<any> {
  if (!model) {
    try {
      model = await initializeModel();
    } catch (error) {
      return {
        exists: false,
        message: 'Model not initialized'
      };
    }
  }
  
  const modelExists = fs.existsSync(path.join(MODEL_DIR, 'model.json'));
  
  return {
    exists: modelExists,
    modelType: 'TensorFlow.js CNN',
    inputShape: model.inputs[0].shape,
    outputShape: model.outputs[0].shape,
    numClasses: NUM_CLASSES,
    charSet: CHAR_SET
  };
}