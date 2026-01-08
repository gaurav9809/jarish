import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load Anime Image
  useEffect(() => {
    const img = new Image();
    // Using a reliable Anime-style placeholder
    img.src = "https://cdn.pixabay.com/photo/2023/12/15/21/53/anime-8451276_1280.jpg";
    img.crossOrigin = "Anonymous";
    imageRef.current = img;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      // --- Audio Data Processing ---
      let average = 0;
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        average = sum / dataArray.length;
      }
      
      // --- Effects ---
      // Scale based on audio volume
      const scale = 1 + (average / 255) * 0.1; 
      
      // Glow intensity based on speaking status
      const glowBlur = isSpeaking ? 20 + (average / 5) : (isActive ? 10 : 0);
      const glowColor = isSpeaking ? 'rgba(0, 240, 255, 0.8)' : 'rgba(0, 168, 255, 0.3)';

      // --- Draw Image ---
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      
      // Clip path for circular avatar
      ctx.beginPath();
      ctx.arc(0, 0, 130, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      // Fix: Check naturalWidth to ensure image is not in 'broken' state
      if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
        // Draw the anime girl
        // Applying a slight blue tint if active
        if (!isActive) ctx.filter = 'grayscale(100%) brightness(0.5)';
        else ctx.filter = `brightness(${1 + average/200})`;

        ctx.drawImage(imageRef.current, -130, -130, 260, 260);
      } else {
        // Fallback if image fails or is loading
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.fillStyle = '#00f0ff';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("INITIALIZING...", 0, 5);
      }
      ctx.restore();

      // --- Draw Rings/Tech UI Overlays ---
      ctx.save();
      ctx.translate(centerX, centerY);

      // Outer Glow Ring
      if (isActive) {
        ctx.beginPath();
        ctx.arc(0, 0, 135 + (average / 10), 0, Math.PI * 2);
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = glowBlur;
        ctx.shadowColor = '#00f0ff';
        ctx.stroke();

        // Rotating Tech Ring
        ctx.rotate(Date.now() / 2000);
        ctx.beginPath();
        ctx.arc(0, 0, 145, 0, Math.PI * 1.5);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
         // Offline Ring
         ctx.beginPath();
         ctx.arc(0, 0, 135, 0, Math.PI * 2);
         ctx.strokeStyle = '#334155';
         ctx.lineWidth = 2;
         ctx.stroke();
      }
      
      ctx.restore();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser, isActive, isSpeaking]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] transition-all duration-300"
    />
  );
};

export default Visualizer;