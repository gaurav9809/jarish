import React, { useEffect, useRef, useState } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    // Using a high-quality, front-facing AI portrait for better lip manipulation
    // This image has a clear jawline which is essential for the cut mechanism
    img.src = "https://img.freepik.com/free-photo/portrait-young-woman-with-natural-make-up_23-2149084942.jpg"; 
    img.crossOrigin = "Anonymous";
    img.onload = () => setImageLoaded(true);
    imageRef.current = img;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);

    const draw = () => {
      // Responsive Sizing
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
      }

      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // --- Audio Logic ---
      let average = 0;
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        // Focus on vocal frequencies (lower mid range)
        const vocalRange = dataArray.slice(10, 50); 
        const sum = vocalRange.reduce((a, b) => a + b, 0);
        average = sum / vocalRange.length;
      }
      
      // Calculate Lip/Jaw Movement
      // We want the jaw to drop when volume is high
      // Threshold: only move if average > 10 to avoid jitter
      const jawDrop = (isSpeaking && average > 10) ? Math.min(average / 6, 25) : 0;

      if (imageRef.current) {
          // --- REALISTIC FACE RENDERING ---
          
          // Calculate Aspect Ratio to 'cover' the canvas
          const imgRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
          const canvasRatio = width / height;
          let drawWidth, drawHeight, offsetX, offsetY;

          if (canvasRatio > imgRatio) {
              drawWidth = width;
              drawHeight = width / imgRatio;
              offsetX = 0;
              offsetY = (height - drawHeight) / 2;
          } else {
              drawHeight = height;
              drawWidth = height * imgRatio;
              offsetX = (width - drawWidth) / 2;
              offsetY = 0;
          }

          // Define the "Jaw Line" relative to the drawn image height
          // For a standard portrait, the mouth is usually around 60-70% down
          const jawYRelative = 0.62; 
          const jawSplitY = offsetY + (drawHeight * jawYRelative);

          // 1. Draw Upper Face (Static)
          // We crop the source image from top to the jaw line
          const sourceJawY = imageRef.current.naturalHeight * jawYRelative;
          
          ctx.save();
          
          // Clip to circle for aesthetics
          ctx.beginPath();
          ctx.arc(width/2, height/2, Math.min(width, height)/2, 0, Math.PI * 2);
          ctx.clip();

          // Draw Top Half
          ctx.drawImage(
              imageRef.current,
              0, 0, imageRef.current.naturalWidth, sourceJawY, // Source Top
              offsetX, offsetY, drawWidth, (drawHeight * jawYRelative) // Dest Top
          );

          // 2. Draw Lower Face (Dynamic Jaw)
          // We draw the bottom half shifted down by 'jawDrop' pixels
          ctx.drawImage(
              imageRef.current,
              0, sourceJawY, imageRef.current.naturalWidth, imageRef.current.naturalHeight - sourceJawY, // Source Bottom
              offsetX, jawSplitY + jawDrop, drawWidth, (drawHeight * (1 - jawYRelative)) // Dest Bottom (Shifted)
          );

          // 3. Draw Inner Mouth (Background for the opening)
          // When jaw drops, we need a dark void behind the lips
          if (jawDrop > 1) {
              ctx.globalCompositeOperation = 'destination-over';
              ctx.fillStyle = '#3a1e1e'; // Dark fleshy color
              ctx.fillRect(offsetX + (drawWidth * 0.3), jawSplitY, drawWidth * 0.4, jawDrop + 5);
              ctx.globalCompositeOperation = 'source-over';
          }
          
          // 4. Offline Overlay
          if (!isActive) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.restore();
      }

      // --- Status Ring ---
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 4;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = isActive 
        ? (isSpeaking ? '#ec4899' : '#8b5cf6') 
        : '#334155';
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser, isActive, isSpeaking, imageLoaded]);

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[300px] md:max-w-[400px]">
        {/* Glow Effects */}
        <div className={`absolute w-[80%] h-[80%] bg-brand-primary/20 rounded-full blur-[60px] animate-pulse ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity`}></div>
        
        <canvas 
        ref={canvasRef} 
        className="w-full h-full relative z-10 rounded-full shadow-2xl"
        style={{ willChange: 'contents' }} 
        />
    </div>
  );
};

export default Visualizer;