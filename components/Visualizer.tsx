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
  
  // Animation State
  const blinkRef = useRef({ isBlinking: false, lastBlink: Date.now(), nextBlinkInterval: 3000 });
  const breathRef = useRef(0);

  useEffect(() => {
    const img = new Image();
    // High-quality Anime/3D Girl (Front Facing)
    img.src = "https://img.freepik.com/premium-photo/cute-anime-girl-with-big-eyes-glasses_670382-120067.jpg"; 
    
    // Fallback if that fails (use a solid color or another reliable URL in real prod)
    img.onerror = () => {
        img.src = "https://img.freepik.com/premium-photo/3d-cartoon-character-cute-girl-avatar_1029469-242036.jpg";
    };

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
      // 1. Resize Canvas to Full Parent
      const parent = canvas.parentElement;
      if (parent) {
          if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
          }
      }
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      // 2. Audio Analysis (Volume)
      let volume = 0;
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        // Focus on vocal frequencies (approx 300Hz - 3kHz range in bin terms)
        const vocalRange = dataArray.slice(5, 40); 
        const sum = vocalRange.reduce((a, b) => a + b, 0);
        volume = sum / vocalRange.length;
      }

      // 3. Animation Variables
      const now = Date.now();
      
      // Breathing (Sine wave scale)
      breathRef.current += 0.02;
      const breathScale = 1 + Math.sin(breathRef.current) * 0.005; // Subtle zoom in/out

      // Blinking
      if (!blinkRef.current.isBlinking && now - blinkRef.current.lastBlink > blinkRef.current.nextBlinkInterval) {
          blinkRef.current.isBlinking = true;
          blinkRef.current.lastBlink = now;
      }
      if (blinkRef.current.isBlinking && now - blinkRef.current.lastBlink > 150) { // Blink duration 150ms
          blinkRef.current.isBlinking = false;
          blinkRef.current.nextBlinkInterval = 2000 + Math.random() * 4000; // Random interval 2-6s
      }

      // Mouth Opening (Based on Volume)
      // Smoother transition
      const targetMouthOpen = (isSpeaking && volume > 5) ? Math.min(volume / 3, 25) : 0;
      // We could lerp this for smoothness, but direct mapping feels more responsive for lip sync
      const mouthOpen = targetMouthOpen;

      if (imageRef.current) {
          const img = imageRef.current;
          
          // Image Positioning (Cover)
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const canvasRatio = width / height;
          let drawW, drawH, offX, offY;

          if (canvasRatio > imgRatio) {
              drawW = width;
              drawH = width / imgRatio;
              offX = 0;
              offY = (height - drawH) / 2;
          } else {
              drawH = height;
              drawW = height * imgRatio;
              offX = (width - drawW) / 2;
              offY = 0;
          }

          // Apply Breathing (Scale from center)
          ctx.save();
          ctx.translate(width/2, height/2);
          ctx.scale(breathScale, breathScale);
          ctx.translate(-width/2, -height/2);

          // ** LIP SYNC RENDERING **
          // Split image at mouth line (approx 60% down for most anime avatars)
          const splitFactor = 0.58; 
          const sourceSplitY = img.naturalHeight * splitFactor;
          const destSplitY = offY + (drawH * splitFactor);

          // Draw Top Half (Head)
          ctx.drawImage(
              img,
              0, 0, img.naturalWidth, sourceSplitY,
              offX, offY, drawW, drawH * splitFactor
          );

          // Draw Blink (Eyelids)
          if (blinkRef.current.isBlinking) {
              ctx.fillStyle = '#e6b8a2'; // Skin tone approx
              // Approx Eye positions (relative to drawW/drawH)
              // Left Eye
              const eyeY = offY + (drawH * 0.45);
              const eyeH = drawH * 0.08;
              const eyeW = drawW * 0.12;
              
              // Simple "closed eye" line or skin patch
              // This is a rough approximation; for production, use a separate "blink" sprite
              // For now, we skip drawing the skin patch to avoid looking weird, 
              // and instead just don't do anything or draw a line.
              // Let's draw a simple dark lash line to simulate closed eye
              ctx.fillStyle = '#4a2c2a';
              ctx.fillRect(offX + (drawW * 0.35), eyeY, eyeW, 3); // Left
              ctx.fillRect(offX + (drawW * 0.53), eyeY, eyeW, 3); // Right
          }

          // Draw Bottom Half (Jaw) - Shifted down by mouthOpen
          ctx.drawImage(
              img,
              0, sourceSplitY, img.naturalWidth, img.naturalHeight - sourceSplitY,
              offX, destSplitY + mouthOpen, drawW, drawH * (1 - splitFactor)
          );

          // Draw Mouth Interior (Black/Dark Red background behind the jaw drop)
          if (mouthOpen > 2) {
             ctx.fillStyle = '#2c0e0e';
             // Position rect between the split
             const mouthW = drawW * 0.15;
             const mouthX = offX + (drawW * 0.5) - (mouthW / 2);
             ctx.fillRect(mouthX, destSplitY, mouthW, mouthOpen + 2);
          }

          ctx.restore();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser, isActive, isSpeaking, imageLoaded]);

  return (
    <div className="w-full h-full relative bg-gray-900 overflow-hidden flex items-center justify-center">
        {!imageLoaded && (
             <div className="text-white text-xs animate-pulse">Loading Avatar...</div>
        )}
        <canvas 
            ref={canvasRef} 
            className="w-full h-full object-cover"
        />
        
        {/* Status Badge */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-red-500'}`}></div>
            <span className="text-[10px] text-white/90 font-semibold tracking-widest uppercase">
                {isActive ? "Connected" : "Reconnecting..."}
            </span>
        </div>
    </div>
  );
};

export default Visualizer;