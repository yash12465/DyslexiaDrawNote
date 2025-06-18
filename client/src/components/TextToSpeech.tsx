
import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text }) => {
  const speak = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={speak}
      disabled={!text}
      className="flex items-center gap-2"
    >
      <Volume2 className="h-4 w-4" />
      Speak
    </Button>
  );
};

export default TextToSpeech;
