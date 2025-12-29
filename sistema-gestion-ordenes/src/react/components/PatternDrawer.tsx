import { useState, useRef, useEffect } from "react";

interface PatternDrawerProps {
  onPatternComplete: (pattern: number[]) => void;
  onClose: () => void;
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
const TOUCH_RADIUS = 40;

export default function PatternDrawer({ onPatternComplete, onClose }: PatternDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pattern, setPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Asegurar tamaño del canvas
    canvas.width = 300;
    canvas.height = 300;

    const draw = () => {
      ctx.clearRect(0, 0, 300, 300);

      // Dibujar líneas del patrón
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 4;
      for (let i = 0; i < pattern.length - 1; i++) {
        const from = PATTERN_POSITIONS.find(p => p.id === pattern[i]);
        const to = PATTERN_POSITIONS.find(p => p.id === pattern[i + 1]);
        if (from && to) {
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        }
      }

      // Dibujar línea actual si hay
      if (currentPoint && pattern.length > 0) {
        const lastPoint = PATTERN_POSITIONS.find(p => p.id === pattern[pattern.length - 1]);
        if (lastPoint) {
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(currentPoint.x, currentPoint.y);
          ctx.stroke();
        }
      }

      // Dibujar puntos
      PATTERN_POSITIONS.forEach((point) => {
        const isSelected = pattern.includes(point.id);
        
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
    };

    draw();
  }, [pattern, currentPoint]);

  function getPointAt(x: number, y: number): number | null {
    for (const point of PATTERN_POSITIONS) {
      const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
      if (distance <= TOUCH_RADIUS) {
        return point.id;
      }
    }
    return null;
  }

  function handleStart(x: number, y: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pointId = getPointAt(x - rect.left, y - rect.top);
    if (pointId && !pattern.includes(pointId)) {
      setPattern([pointId]);
      setIsDrawing(true);
    }
  }

  function handleMove(x: number, y: number) {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = x - rect.left;
    const canvasY = y - rect.top;
    setCurrentPoint({ x: canvasX, y: canvasY });

    const pointId = getPointAt(canvasX, canvasY);
    if (pointId && !pattern.includes(pointId) && pattern.length > 0) {
      setPattern([...pattern, pointId]);
    }
  }

  function handleEnd() {
    if (isDrawing && pattern.length >= 4) {
      onPatternComplete(pattern);
    } else if (isDrawing) {
      alert("El patrón debe tener al menos 4 puntos");
      setPattern([]);
    }
    setIsDrawing(false);
    setCurrentPoint(null);
  }

  // Eventos del mouse
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    handleStart(e.clientX, e.clientY);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    handleMove(e.clientX, e.clientY);
  }

  function handleMouseUp() {
    handleEnd();
  }

  // Eventos táctiles
  function handleTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    handleEnd();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">Dibujar Patrón de Desbloqueo</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Dibuja tu patrón conectando al menos 4 puntos
        </p>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={300}
            height={300}
            className="border-2 border-slate-300 rounded-lg cursor-crosshair touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setPattern([]);
              setCurrentPoint(null);
            }}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Limpiar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

