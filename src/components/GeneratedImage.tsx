import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface GeneratedImageProps {
  src: string;
  isDarkMode: boolean;
}

export const GeneratedImage: React.FC<GeneratedImageProps> = ({ src, isDarkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processImage = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;

      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height + 60; // Extra space for footer

        // Fill background for footer
        ctx.fillStyle = isDarkMode ? '#18181b' : '#f4f4f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Draw footer text "Ibkia"
        ctx.fillStyle = '#10b981'; // emerald-500
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Ibkia', canvas.width / 2, img.height + 40);

        // Draw a small logo (Sparkles icon simplified or just text)
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText('✨', canvas.width / 2 - 45, img.height + 38);

        setProcessedSrc(canvas.toDataURL('image/png'));
        setIsProcessing(false);
      };
    };

    processImage();
  }, [src, isDarkMode]);

  const handleDownload = () => {
    if (!processedSrc) return;
    const link = document.createElement('a');
    link.href = processedSrc;
    link.download = `ibkia-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(
        "relative rounded-2xl overflow-hidden border shadow-xl group",
        isDarkMode ? "border-zinc-800" : "border-zinc-200"
      )}>
        <canvas ref={canvasRef} className="hidden" />
        
        {isProcessing ? (
          <div className={cn(
            "w-full h-64 flex flex-col items-center justify-center gap-3",
            isDarkMode ? "bg-zinc-900" : "bg-zinc-100"
          )}>
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <p className="text-xs text-zinc-500">Traitement de l'image...</p>
          </div>
        ) : (
          <>
            <img 
              src={processedSrc || src} 
              alt="Générée par Ibkane IA" 
              className="max-w-full object-contain"
            />
            <button
              onClick={handleDownload}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              title="Télécharger l'image"
            >
              <Download className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
