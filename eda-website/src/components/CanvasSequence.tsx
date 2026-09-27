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

    // Optional: Make it responsive to window size (4K default)
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const frameIndex = Math.round(airpods.frame);
      const img = images[frameIndex];
      if (img && img.complete) {
        // Draw image covering the whole canvas (object-fit: cover equivalent)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }
    }

    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
