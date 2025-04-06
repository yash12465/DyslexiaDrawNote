import { createWorker } from 'tesseract.js';

interface RecognitionResult {
  text: string;
  suggestions: Array<{
    original: string;
    correction: string;
  }>;
}

export async function recognizeText(
  imageData: string
): Promise<RecognitionResult> {
  try {
    const worker = await createWorker('eng');
    const result = await worker.recognize(imageData);
    await worker.terminate();

    // Primitive spelling check - this would be replaced with a more
    // sophisticated solution in a production environment
    const text = result.data.text;
    const words = text.split(/\s+/);
    const suggestions: Array<{ original: string; correction: string }> = [];

    // This is a very primitive placeholder for spelling errors
    // In a real app, you would use a proper spell-checking library
    const commonMisspellings: Record<string, string> = {
      developement: "development",
      progres: "progress",
      recieve: "receive",
      freind: "friend",
      thier: "their",
      speling: "spelling",
      occured: "occurred",
      concieve: "conceive",
      wierd: "weird",
      acheive: "achieve",
      seperate: "separate",
      definately: "definitely",
      accomodate: "accommodate",
      untill: "until",
      beleive: "believe",
      existance: "existence",
      goverment: "government",
      enviroment: "environment",
      occassion: "occasion",
      dissapear: "disappear",
      tommorow: "tomorrow",
      begining: "beginning",
      comming: "coming",
      independant: "independent",
      successfull: "successful"
    };

    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (commonMisspellings[cleanWord]) {
        suggestions.push({
          original: cleanWord,
          correction: commonMisspellings[cleanWord]
        });
      }
    });

    return {
      text,
      suggestions
    };
  } catch (error) {
    console.error('Text recognition error:', error);
    return {
      text: '',
      suggestions: []
    };
  }
}
