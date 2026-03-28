import { useEffect, useMemo, useRef, useState } from "react";
import { deviceDatabase, getSmartSuggestions, type DeviceCategory } from "@/lib/deviceDatabase";

type DeviceType = "Celular" | "Tablet" | "Notebook" | "Smartwatch" | "Otro";

interface DeviceWizardPickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const typeOrder: DeviceType[] = ["Celular", "Tablet", "Notebook", "Smartwatch", "Otro"];

const typeByBrand: Record<string, DeviceType> = {
  iPhone: "Celular",
  Samsung: "Celular",
  Huawei: "Celular",
  iPad: "Tablet",
  MacBook: "Notebook",
  "Apple Watch": "Smartwatch",
};

const typeAliases: Record<DeviceType, string[]> = {
  Celular: ["celular", "telefono", "phone", "movil"],
  Tablet: ["tablet", "ipad"],
  Notebook: ["notebook", "laptop", "macbook", "pc"],
  Smartwatch: ["smartwatch", "watch", "reloj"],
  Otro: ["otro"],
};

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function guessTypeFromValue(value: string): DeviceType | null {
  const normalized = normalize(value);
  if (!normalized) return null;

  const matchedBrand = deviceDatabase.find((cat) =>
    normalized.startsWith(cat.brand.toLowerCase())
  );

  if (matchedBrand && typeByBrand[matchedBrand.brand]) {
    return typeByBrand[matchedBrand.brand];
  }

  const byAlias = typeOrder.find((type) =>
    typeAliases[type].some((alias) => normalized.includes(alias))
  );

  return byAlias ?? null;
}

function getBrandsForType(type: DeviceType): DeviceCategory[] {
  if (type === "Otro") return deviceDatabase;
  return deviceDatabase.filter((category) => typeByBrand[category.brand] === type);
}

export default function DeviceWizardPicker({ value, onChange, required = false }: DeviceWizardPickerProps) {
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (value.trim().length < 1) return [];
    return getSmartSuggestions(value);
  }, [value]);

  const availableBrands = useMemo(() => {
    if (!selectedType) return [];
    return getBrandsForType(selectedType);
  }, [selectedType]);

  const selectedBrandData = useMemo(
    () => deviceDatabase.find((category) => category.brand === selectedBrand) ?? null,
    [selectedBrand]
  );

  const quickModels = useMemo(() => {
    if (!selectedBrandData) return [];

    return selectedBrandData.models
      .flatMap((model) => {
        const base = `${selectedBrandData.brand} ${model.base}`.trim();
        const variants = model.variants.filter(Boolean);
        if (variants.length === 0) return [base];
        return [base, ...variants.map((variant) => `${base} ${variant}`.trim())];
      })
      .slice(0, 24);
  }, [selectedBrandData]);

  useEffect(() => {
    const guessedType = guessTypeFromValue(value);
    if (guessedType) {
      setSelectedType(guessedType);
    }

    const normalized = normalize(value);
    const brand = deviceDatabase.find((category) => normalized.startsWith(category.brand.toLowerCase()));
    setSelectedBrand(brand?.brand ?? null);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTypeClick = (type: DeviceType) => {
    setSelectedType(type);
    setSelectedBrand(null);
    if (value.trim() === "") {
      onChange(type === "Otro" ? "" : "");
    }
  };

  const handleBrandClick = (brand: string) => {
    setSelectedBrand(brand);
    onChange(brand);
    inputRef.current?.focus();
  };

  const handleModelClick = (model: string) => {
    onChange(model);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">1) Tipo de equipo</p>
        <div className="flex flex-wrap gap-2">
          {typeOrder.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeClick(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selectedType === type
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-700 border-slate-300 hover:border-brand hover:text-brand"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {selectedType && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">2) Marca</p>
          <div className="flex flex-wrap gap-2">
            {availableBrands.map((category) => (
              <button
                key={category.brand}
                type="button"
                onClick={() => handleBrandClick(category.brand)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedBrand === category.brand
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-700 border-slate-300 hover:border-brand hover:text-brand"
                }`}
              >
                {category.brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedBrand && quickModels.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">3) Modelo sugerido</p>
          <div className="flex flex-wrap gap-2 max-h-36 overflow-auto pr-1">
            {quickModels.map((model) => (
              <button
                key={model}
                type="button"
                onClick={() => handleModelClick(model)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-300 text-slate-700 bg-white hover:border-brand hover:text-brand"
              >
                {model}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(e.target.value.trim().length > 0);
            setSelectedSuggestionIndex(-1);
          }}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          onKeyDown={(e) => {
            if (!showSuggestions || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelectedSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelectedSuggestionIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = selectedSuggestionIndex >= 0 ? suggestions[selectedSuggestionIndex] : suggestions[0];
              handleModelClick(pick);
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          placeholder="Escribe o toca un modelo (ej: Samsung Galaxy A54)"
          className="w-full border border-slate-300 rounded-md px-3 py-2"
          required={required}
          autoComplete="off"
        />

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionBoxRef}
            className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-56 overflow-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => handleModelClick(suggestion)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-brand/10 ${
                  index === selectedSuggestionIndex ? "bg-brand/20" : ""
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
