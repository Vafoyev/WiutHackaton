import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CanvasSequenceProps {
  frameCount: number;
  // A function that returns the URL for a specific frame index (1-indexed usually)
  getFrameUrl: (index: number) => string;
}

export const CanvasSequence: React.FC<CanvasSequenceProps> = ({ frameCount, getFrameUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resizeCanvas = () => {
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      // Ensure CSS size remains the same
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      // Normalize coordinate system to use css pixels
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    const images: HTMLImageElement[] = [];
    const airpods = { frame: 0 };

    // Preload images
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      // Start from frame 1
      img.src = getFrameUrl(i + 1);
      images.push(img);
    }

    // Draw the first frame when it loads
    images[0].onload = render;

    function render() {
      if (!canvas || !ctx) return;
      
      // We scaled the context, so we clear using the logical width/height
      const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
      const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      
      const frameIndex = Math.round(airpods.frame);
      const img = images[frameIndex];
      if (img && img.complete) {
        // Draw image covering the whole canvas (object-fit: cover equivalent)
        const scale = Math.max(logicalWidth / img.width, logicalHeight / img.height);
        const x = (logicalWidth / 2) - (img.width / 2) * scale;
        const y = (logicalHeight / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }
    }

    // Resize handler
    const handleResize = () => {
      resizeCanvas();
      render();
    };
    window.addEventListener('resize', handleResize);

    // GSAP ScrollTrigger
    const tl = gsap.to(airpods, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=800%', // Scroll for 8 screen heights to make it slower
        scrub: 2, // 2s smoothing for extremely smooth rendering
        pin: true, // Pin the canvas while scrolling
      },
      onUpdate: render,
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [frameCount, getFrameUrl]);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#030708]">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
};
