import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface CanvasSequenceProps {
  frameCount: number;
  texts?: string[];
  getFrameUrl: (index: number) => string;
}

export const CanvasSequence: React.FC<CanvasSequenceProps> = ({ frameCount, texts = [], getFrameUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();

    const images: HTMLImageElement[] = [];
    const airpods = { frame: 0 };

    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.src = getFrameUrl(i + 1);
      images.push(img);
    }

    images[0].onload = render;

    function render() {
      if (!canvas || !ctx) return;
      
      const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
      const logicalHeight = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      
      const frameIndex = Math.round(airpods.frame);
      const img = images[frameIndex];
      if (img && img.complete) {
        const scale = Math.max(logicalWidth / img.width, logicalHeight / img.height);
        const x = (logicalWidth / 2) - (img.width / 2) * scale;
        const y = (logicalHeight / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }
    }

    const handleResize = () => {
      resizeCanvas();
      render();
    };
    window.addEventListener('resize', handleResize);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=800%',
        scrub: 2,
        pin: true,
      }
    });

    // Animate the frames
    tl.to(airpods, {
      frame: frameCount - 1,
      snap: 'frame',
      ease: 'none',
      onUpdate: render,
    }, 0);

    // Fade texts in and out if texts exist
    if (texts.length > 0) {
      const segment = (frameCount - 1) / texts.length;
      texts.forEach((_, i) => {
        const textElement = textRefs.current[i];
        if (textElement) {
          // Fade in
          tl.to(textElement, {
            opacity: 1,
            y: 0,
            duration: segment * 0.2, // 20% of segment to fade in
            ease: 'power2.out'
          }, segment * i);
          
          // Hold
          tl.to(textElement, {
            opacity: 1,
            duration: segment * 0.6 // 60% hold
          }, segment * i + segment * 0.2);
          
          // Fade out
          tl.to(textElement, {
            opacity: 0,
            y: -30,
            duration: segment * 0.2, // 20% of segment to fade out
            ease: 'power2.in'
          }, segment * i + segment * 0.8);
        }
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      tl.kill();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [frameCount, getFrameUrl, texts]);

  return (
    <div ref={containerRef} className="relative w-full h-screen bg-[#030708] overflow-hidden flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      
      {texts.map((text, i) => (
        <div 
          key={i}
          ref={el => { textRefs.current[i] = el; }}
          className="absolute z-10 p-6 md:p-8 max-w-2xl bg-black/40 backdrop-blur-md rounded-2xl border border-[#22f396]/30 shadow-[0_0_40px_rgba(34,243,150,0.1)] text-center transform translate-y-10 opacity-0"
        >
          <h2 className="text-xl md:text-3xl font-hud tracking-wide text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] glow-text">
            {text}
          </h2>
        </div>
      ))}
    </div>
  );
};
