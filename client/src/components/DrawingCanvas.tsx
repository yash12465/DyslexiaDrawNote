import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import ColorPicker from './ColorPicker';
import PenSizePicker from './PenSizePicker';
import { HistoryItem, createEmptyImageData } from '@/lib/utils';
import { 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2, 
  Type,
  Shapes
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface DrawingCanvasProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const DrawingCanvas = ({ 
  initialContent,
  onContentChange,
  onCanvasReady
}: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(2);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    
    if (!canvas || !container) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // If we have history, restore the last state
      if (historyIndex >= 0 && history[historyIndex]) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(history[historyIndex].imageData, 0, 0);
        }
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // If there's initial content, load it
    if (initialContent) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          saveHistoryState();
        }
      };
      img.src = initialContent;
    } else {
      // Save initial blank state
      saveHistoryState();
    }
    
    // Notify parent component that canvas is ready
    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Save current canvas state to history
  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If we're not at the end of the history, truncate it
    if (historyIndex < history.length - 1) {
      setHistory(prev => prev.slice(0, historyIndex + 1));
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    setHistory(prev => [...prev, { imageData }]);
    setHistoryIndex(prev => prev + 1);
    
    // Notify parent of content change
    if (onContentChange) {
      onContentChange(canvas.toDataURL());
    }
  };
  
  // Undo function
  const handleUndo = () => {
    if (historyIndex <= 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setHistoryIndex(prev => prev - 1);
    ctx.putImageData(history[historyIndex - 1].imageData, 0, 0);
    
    // Notify parent of content change
    if (onContentChange) {
      onContentChange(canvas.toDataURL());
    }
  };
  
  // Redo function
  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setHistoryIndex(prev => prev + 1);
    ctx.putImageData(history[historyIndex + 1].imageData, 0, 0);
    
    // Notify parent of content change
    if (onContentChange) {
      onContentChange(canvas.toDataURL());
    }
  };
  
  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
  };
  
  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setLastPosition({ x, y });
  };
  
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (currentTool === 'pen') {
      ctx.strokeStyle = penColor;
      ctx.globalCompositeOperation = 'source-over';
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.globalCompositeOperation = 'destination-out';
    }
    
    ctx.beginPath();
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    setLastPosition({ x, y });
  };
  
  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistoryState();
    }
  };
  
  // Handle tool changes
  const handleToolChange = (tool: 'pen' | 'eraser') => {
    setCurrentTool(tool);
  };
  
  // Handle pen color change
  const handleColorChange = (color: string) => {
    setPenColor(color);
    setCurrentTool('pen');
  };
  
  // Handle pen size change
  const handleSizeChange = (size: number) => {
    setPenSize(size);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-3 mb-4 flex flex-wrap items-center justify-between">
        {/* Left Tools Group */}
        <div className="flex items-center space-x-2 mb-2 md:mb-0">
          {/* Pen Tools */}
          <div className="border-r pr-2 mr-2">
            <PenSizePicker onSizeChange={handleSizeChange} defaultSize={penSize} />
          </div>
          
          {/* Color Picker */}
          <ColorPicker onColorChange={handleColorChange} defaultColor={penColor} />
        </div>
        
        {/* Right Tools Group */}
        <div className="flex items-center space-x-3">
          <Button
            variant={currentTool === 'eraser' ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => handleToolChange('eraser')}
            title="Eraser"
          >
            <Eraser className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            title="Text Tool"
          >
            <Type className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            title="Shapes"
          >
            <Shapes className="h-5 w-5" />
          </Button>
          
          <Separator orientation="vertical" className="h-8" />
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo2 className="h-5 w-5" />
          </Button>
          
          <Separator orientation="vertical" className="h-8" />
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            title="Clear Canvas"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div 
        ref={canvasContainerRef}
        className="bg-white rounded-lg shadow-lg p-1 overflow-hidden canvas-container"
        style={{ height: '70vh' }}
      >
        <canvas
          ref={canvasRef}
          className="w-full border border-gray-200 rounded-lg bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;
