import { useState, useRef, useEffect, useMemo } from "react";
import { getSmartSuggestions } from "@/lib/deviceDatabase";

interface DeviceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function DeviceAutocomplete({
  value,
  onChange,
  placeholder = "Ej: iPhone 13 Pro",
  className = "",
  required = false,
}: DeviceAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Obtener sugerencias cuando cambia el valor
  const filteredSuggestions = useMemo(() => {
    if (!value || value.trim().length < 1) {
      return [];
    }
    return getSmartSuggestions(value);
  }, [value]);

  useEffect(() => {
    setSuggestions(filteredSuggestions);
    setShowSuggestions(filteredSuggestions.length > 0 && value.trim().length > 0);
    setSelectedIndex(-1);
  }, [filteredSuggestions, value]);

  // Manejar click fuera para cerrar sugerencias
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          handleSelectSuggestion(suggestions[0]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && value.trim().length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`w-full border border-slate-300 rounded-md px-3 py-2 ${className}`}
        required={required}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className={`px-3 py-2 cursor-pointer hover:bg-brand/10 transition-colors ${
                index === selectedIndex ? "bg-brand/20" : ""
              } ${index === 0 ? "rounded-t-md" : ""} ${
                index === suggestions.length - 1 ? "rounded-b-md" : ""
              }`}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="text-sm text-slate-900">{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

