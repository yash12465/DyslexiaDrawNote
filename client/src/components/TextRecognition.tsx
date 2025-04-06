import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { recognizeText } from '@/lib/tesseract';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface TextRecognitionProps {
  canvasElement: HTMLCanvasElement | null;
  onTextRecognized?: (text: string) => void;
}

const TextRecognition = ({ canvasElement, onTextRecognized }: TextRecognitionProps) => {
  const [recognizedText, setRecognizedText] = useState('');
  const [suggestions, setSuggestions] = useState<{ original: string; correction: string }[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const handleRecognizeText = async () => {
    if (!canvasElement) return;
    
    setIsRecognizing(true);
    
    try {
      const imageData = canvasElement.toDataURL('image/png');
      const result = await recognizeText(imageData);
      
      setRecognizedText(result.text);
      setSuggestions(result.suggestions);
      
      if (onTextRecognized) {
        onTextRecognized(result.text);
      }
    } catch (error) {
      console.error('Error recognizing text:', error);
    } finally {
      setIsRecognizing(false);
    }
  };

  const applySuggestion = (original: string, correction: string) => {
    setRecognizedText(prevText => 
      prevText.replace(new RegExp(original, 'gi'), correction)
    );
    
    // Remove the applied suggestion
    setSuggestions(prevSuggestions => 
      prevSuggestions.filter(s => s.original !== original)
    );
    
    if (onTextRecognized) {
      onTextRecognized(recognizedText.replace(new RegExp(original, 'gi'), correction));
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="font-dyslexic text-lg">Text Recognition</CardTitle>
          <Button 
            onClick={handleRecognizeText} 
            disabled={!canvasElement || isRecognizing}
            size="sm"
          >
            {isRecognizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Recognize Text'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 font-dyslexic text-gray-800 p-3 bg-gray-50 rounded-lg min-h-12">
          {recognizedText || 'Draw something and click "Recognize Text" to see the result'}
        </div>
        
        {suggestions.length > 0 && (
          <>
            <Separator className="my-3" />
            <h4 className="font-dyslexic font-semibold text-sm text-gray-600 mb-2">
              Suggested Corrections:
            </h4>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(({ original, correction }, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="font-dyslexic bg-accent bg-opacity-10 text-accent hover:bg-opacity-20 text-sm"
                  onClick={() => applySuggestion(original, correction)}
                >
                  "{original}" → "{correction}"
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TextRecognition;
