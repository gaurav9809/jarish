import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    // A more aesthetic, soft anime/digital art style avatar
    img.src = "https://cdn.pixabay.com/photo/2022/12/01/04/43/girl-7628308_1280.jpg"; 
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
      // Dynamic Sizing based on computed style (responsive)
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
      }

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Calculate responsive radius
      const baseRadius = Math.min(width, height) * 0.3; // 30% of smallest dimension
      
      ctx.clearRect(0, 0, width, height);

      // --- Audio Data Processing ---
      let average = 0;
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        average = sum / dataArray.length;
      }
      
      // --- Smooth Pulsing Effect ---
      // Reduce math operations if not active
      const pulse = Math.sin(Date.now() / 1000) * 5;
      const speakScale = isSpeaking ? (average / 50) : 0;
      const baseScale = 1 + speakScale;

      ctx.save();
      ctx.translate(centerX, centerY);
      
      // 1. Outer Glow (Soft Halo) - Optimization: Only draw if active
      if (isActive) {
          const gradient = ctx.createRadialGradient(0, 0, baseRadius * 0.8, 0, 0, baseRadius * 1.4 + average);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)'); // Violet
          gradient.addColorStop(1, 'rgba(236, 72, 153, 0.0)'); // Pink fade
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, baseRadius * 1.5 + average, 0, Math.PI * 2);
          ctx.fill();
      }

      // 2. Avatar Container
      ctx.scale(baseScale, baseScale);
      
      // Border Circle
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2, true);
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.strokeStyle = isActive ? (isSpeaking ? '#ec4899' : '#8b5cf6') : '#4b5563';
      ctx.stroke();
      ctx.closePath();
      
      // Clip for Image
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius - 5, 0, Math.PI * 2, true);
      ctx.clip();

      if (imageRef.current && imageRef.current.complete && imageRef.current.naturalWidth > 0) {
        // Draw image covering the circle
        const size = baseRadius * 2;
        ctx.drawImage(imageRef.current, -baseRadius, -baseRadius, size, size);
        
        // Overlay tint based on state
        if (!isActive) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; // Darken when offline
            ctx.fill();
        }
      } else {
        ctx.fillStyle = '#1e1b4b';
        ctx.fill();
      }

      ctx.restore();

      // 3. Audio Frequency Bars (Circular)
      if (isActive && analyser) {
          ctx.save();
          ctx.translate(centerX, centerY);
          const bars = 40;
          const step = (Math.PI * 2) / bars;
          
          for (let i = 0; i < bars; i++) {
              const value = dataArray[i * 2] || 0;
              const barHeight = (value / 255) * (baseRadius * 0.35); // Bar height relative to radius
              
              ctx.rotate(step);
              
              ctx.fillStyle = isSpeaking ? '#ec4899' : '#8b5cf6';
              ctx.globalAlpha = 0.6;
              ctx.beginPath();
              
              // Simple rect for performance compatibility
              ctx.rect(baseRadius + 10, -2, barHeight + 5, 4); 
              
              ctx.fill();
          }
          ctx.restore();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser, isActive, isSpeaking]);

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[300px] md:max-w-[400px]">
        {/* Decorative background blobs */}
        <div className={`absolute w-[70%] h-[70%] bg-brand-primary/30 rounded-full blur-3xl mix-blend-screen animate-blob ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}></div>
        <div className={`absolute w-[70%] h-[70%] bg-brand-secondary/30 rounded-full blur-3xl mix-blend-screen animate-blob animation-delay-2000 ${isActive ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}></div>

        <canvas 
        ref={canvasRef} 
        className="w-full h-full relative z-10"
        style={{ willChange: 'transform' }} 
        />
    </div>
  );
};

export default Visualizer;