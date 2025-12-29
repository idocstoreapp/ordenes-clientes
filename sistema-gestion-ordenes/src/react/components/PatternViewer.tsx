import { useEffect, useRef, useState } from "react";

interface PatternViewerProps {
  pattern: number[];
  size?: number;
}

// Posiciones de los 9 puntos del patrón (grid 3x3)
const PATTERN_POSITIONS = [
  { id: 1, x: 50, y: 50 },
  { id: 2, x: 150, y: 50 },
  { id: 3, x: 250, y: 50 },
  { id: 4, x: 50, y: 150 },
  { id: 5, x: 150, y: 150 },
  { id: 6, x: 250, y: 150 },
  { id: 7, x: 50, y: 250 },
  { id: 8, x: 150, y: 250 },
  { id: 9, x: 250, y: 250 },
];

const POINT_RADIUS = 25;

export default function PatternViewer({ pattern, size = 300 }: PatternViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pattern.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Asegurar tamaño del canvas
    canvas.width = size;
    canvas.height = size;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      
      // Escalar para mantener proporciones
      const scale = size / 300;
      ctx.save();
      ctx.scale(scale, scale);

      // Dibujar líneas hasta el punto actual
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 4;
      for (let i = 0; i < currentIndex; i++) {
        const from = PATTERN_POSITIONS.find(p => p.id === pattern[i]);
        const to = PATTERN_POSITIONS.find(p => p.id === pattern[i + 1]);
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }

      // Dibujar puntos
      PATTERN_POSITIONS.forEach((point) => {
        const isSelected = pattern.slice(0, currentIndex + 1).includes(point.id);
        
        // Círculo exterior
        ctx.fillStyle = isSelected ? "#3b82f6" : "#e5e7eb";
        ctx.beginPath();
        ctx.arc(point.x, point.y, POINT_RADIUS, 0, 2 * Math.PI);
        ctx.fill();

        // Círculo interior
        ctx.fillStyle = isSelected ? "#ffffff" : "#9ca3af";
        ctx.beginPath();
        ctx.arc(point.x, point.y, POINT_RADIUS - 8, 0, 2 * Math.PI);
        ctx.fill();
      });
      
      ctx.restore();
    };

    draw();
  }, [pattern, currentIndex, size]);

  useEffect(() => {
    if (pattern.length === 0) {
      setCurrentIndex(0);
      return;
    }

    // Reiniciar animación cuando cambia el patrón
    setCurrentIndex(0);
    
    let timeoutId: NodeJS.Timeout;
    const animate = () => {
      setCurrentIndex((prev) => {
        if (prev >= pattern.length - 1) {
          // Reiniciar después de una pausa
          timeoutId = setTimeout(() => {
            setCurrentIndex(0);
          }, 500);
          return prev;
        }
        return prev + 1;
      });
    };

    const interval = setInterval(animate, 300);
    
    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pattern]);

  if (pattern.length === 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="border border-slate-300 rounded-lg"
      style={{ maxWidth: "100%" }}
    />
  );
}

