
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ analyser, isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const dataArray = new Uint8Array(analyser ? analyser.frequencyBinCount : 0);

    const draw = () => {
      const width = canvas.width = canvas.parentElement?.clientWidth || 300;
      const height = canvas.height = canvas.parentElement?.clientHeight || 400;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      let volume = 0;
      if (analyser && isActive) {
        analyser.getByteFrequencyData(dataArray);
        volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      }

      const time = Date.now() / 1000;
      const baseRadius = Math.min(width, height) * 0.2;
      const pulse = isActive ? (volume / 255) * 60 : 0;
      
      // Draw Glow Background
      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, baseRadius * 2);
      gradient.addColorStop(0, isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw Rotating Neural Rings
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const r = baseRadius + pulse + (i * 20);
        const rotation = time * (0.5 + i * 0.2);
        
        ctx.strokeStyle = isActive ? `rgba(99, 102, 241, ${0.8 - i * 0.2})` : `rgba(255, 255, 255, ${0.1})`;
        ctx.lineWidth = 2 - i * 0.5;
        
        // Draw dashed ring
        ctx.setLineDash([5 + i * 10, 15]);
        ctx.arc(centerX, centerY, r, rotation, rotation + Math.PI * 1.5);
        ctx.stroke();
      }

      // Draw The Core
      ctx.setLineDash([]);
      ctx.beginPath();
      const coreR = (baseRadius * 0.5) + (pulse * 0.8);
      const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreR);
      coreGradient.addColorStop(0, isActive ? '#818cf8' : '#333');
      coreGradient.addColorStop(1, isActive ? '#4f46e5' : '#111');
      
      ctx.fillStyle = coreGradient;
      ctx.shadowBlur = isActive ? 30 : 5;
      ctx.shadowColor = isActive ? '#6366f1' : 'transparent';
      ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Reactive Waveforms
      if (isActive && isSpeaking) {
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        const wavePoints = 60;
        for (let i = 0; i <= wavePoints; i++) {
            const angle = (i / wavePoints) * Math.PI * 2;
            const freqIndex = Math.floor((i / wavePoints) * dataArray.length * 0.2);
            const amplitude = (dataArray[freqIndex] / 255) * 40;
            const x = centerX + Math.cos(angle) * (coreR + 5 + amplitude);
            const y = centerY + Math.sin(angle) * (coreR + 5 + amplitude);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Draw Floating "Neural Nodes"
      const nodes = 8;
      for (let i = 0; i < nodes; i++) {
          const angle = (time * 0.3) + (i / nodes) * Math.PI * 2;
          const dist = baseRadius * 1.5 + Math.sin(time + i) * 10;
          const x = centerX + Math.cos(angle) * dist;
          const y = centerY + Math.sin(angle) * dist;
          
          ctx.beginPath();
          ctx.fillStyle = isActive ? 'rgba(129, 140, 248, 0.6)' : 'rgba(255,255,255,0.1)';
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Connect to core
          ctx.beginPath();
          ctx.strokeStyle = isActive ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)';
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(x, y);
          ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, isActive, isSpeaking]);

  return (
    <div className="w-full h-full relative bg-black overflow-hidden flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
        }}></div>
    </div>
  );
};

export default Visualizer;
