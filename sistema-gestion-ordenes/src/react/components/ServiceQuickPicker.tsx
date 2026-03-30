import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ServiceQuickPickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const fallbackServices = [
  "Cambio de mica",
  "Soldadura",
  "Cambio de pantalla",
  "Cambio de batería",
  "Cambio de pin de carga",
  "Cambio de tapa trasera",
  "Actualización de software",
  "Diagnóstico",
  "Limpieza interna",
  "Recuperación de datos",
];

export default function ServiceQuickPicker({ value, onChange, required = false }: ServiceQuickPickerProps) {
  const [servicePool, setServicePool] = useState<string[]>(fallbackServices);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPopularServices() {
      const { data, error } = await supabase
        .from("orders")
        .select("service_description")
        .not("service_description", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error || !data || !isMounted) {
        return;
      }

      const countMap = new Map<string, number>();
      data.forEach((row) => {
        const clean = row.service_description?.trim();
        if (!clean) return;
        countMap.set(clean, (countMap.get(clean) ?? 0) + 1);
      });

      const sorted = [...countMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([service]) => service);

      const merged = [...new Set([...sorted, ...fallbackServices])].slice(0, 80);
      if (merged.length > 0) {
        setServicePool(merged);
      }
    }

    loadPopularServices();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  const quickButtons = useMemo(() => servicePool.slice(0, 8), [servicePool]);

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];
    return servicePool
      .filter((service) => service.toLowerCase().includes(query))
      .slice(0, 8);
  }, [servicePool, value]);

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3 bg-slate-50/60" ref={wrapperRef}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Servicios más usados (toque rápido)</p>
        <div className="flex flex-wrap gap-2">
          {quickButtons.map((service) => (
            <button
              type="button"
              key={service}
              onClick={() => {
                onChange(service);
                setShowSuggestions(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                value === service
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-700 border-slate-300 hover:border-brand hover:text-brand"
              }`}
            >
              {service}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(e.target.value.trim().length >= 2);
            setActiveIndex(-1);
          }}
          onFocus={() => setShowSuggestions(value.trim().length >= 2 && filteredSuggestions.length > 0)}
          onKeyDown={(e) => {
            if (!showSuggestions || filteredSuggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const selected = activeIndex >= 0 ? filteredSuggestions[activeIndex] : filteredSuggestions[0];
              onChange(selected);
              setShowSuggestions(false);
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          placeholder="Escribe 2 letras para filtrar servicios"
          required={required}
          autoComplete="off"
        />

        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-56 overflow-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand/10 ${
                  index === activeIndex ? "bg-brand/20" : ""
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}


        {value.trim().length >= 2 && filteredSuggestions.length === 0 && (
          <p className="text-xs text-slate-500 mt-2">Sin coincidencias exactas. Puedes guardar el texto tal como lo escribiste.</p>
        )}
      </div>

      <p className="text-xs text-slate-500">Tip: con 2 letras aparecen coincidencias (ej: "pa" → pantalla).</p>
    </div>
  );
}