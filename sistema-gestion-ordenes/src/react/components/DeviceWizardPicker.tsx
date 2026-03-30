import { useMemo, useState } from "react";
import { deviceDatabase } from "@/lib/deviceDatabase";

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

function dedupe(values: string[]) {
  return [...new Set(values)];
}

function getBrandsForType(type: DeviceType) {
  if (type === "Otro") return deviceDatabase;
  return deviceDatabase.filter((category) => typeByBrand[category.brand] === type);
}

export default function DeviceWizardPicker({ value, onChange, required = false }: DeviceWizardPickerProps) {
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedBase, setSelectedBase] = useState<string | null>(null);

  const availableBrands = useMemo(() => {
    if (!selectedType) return [];
    return getBrandsForType(selectedType);
  }, [selectedType]);

  const selectedBrandData = useMemo(
    () => availableBrands.find((brand) => brand.brand === selectedBrand) ?? null,
    [availableBrands, selectedBrand]
  );

  const baseModels = useMemo(() => {
    if (!selectedBrandData) return [];
    return dedupe(selectedBrandData.models.map((model) => model.base));
  }, [selectedBrandData]);

  const variantsForBase = useMemo(() => {
    if (!selectedBrandData || !selectedBase) return [];
    const model = selectedBrandData.models.find((item) => item.base === selectedBase);
    if (!model) return [];

    const fullBase = `${selectedBrandData.brand} ${model.base}`.trim();
    const variantValues = model.variants.filter((variant) => variant.trim().length > 0);

    return [fullBase, ...variantValues.map((variant) => `${fullBase} ${variant}`.trim())];
  }, [selectedBrandData, selectedBase]);

  const topQuickDevices = useMemo(
    () => [
      "iPhone 11",
      "iPhone 12",
      "iPhone 12 Pro",
      "iPhone 13",
      "iPhone 13 Pro Max",
      "Samsung Galaxy A54",
      "Samsung Galaxy S24 Ultra",
      "Huawei P60 Pro",
      "MacBook Air M2 13\"",
      "iPad Air M2",
      "Apple Watch Series 9 45mm",
    ],
    []
  );

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-3 bg-slate-50/60">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Wizard rápido</p>
        <div className="flex flex-wrap gap-2">
          {typeOrder.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedType(type);
                setSelectedBrand(null);
                setSelectedBase(null);
              }}
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Marca</p>
          <div className="flex flex-wrap gap-2">
            {availableBrands.map((brand) => (
              <button
                key={brand.brand}
                type="button"
                onClick={() => {
                  setSelectedBrand(brand.brand);
                  setSelectedBase(null);
                  onChange(brand.brand);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedBrand === brand.brand
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-700 border-slate-300 hover:border-brand hover:text-brand"
                }`}
              >
                {brand.brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedBrand && baseModels.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Modelo</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-auto pr-1">
            {baseModels.map((base) => (
              <button
                key={base}
                type="button"
                onClick={() => {
                  setSelectedBase(base);
                  onChange(`${selectedBrand} ${base}`.trim());
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedBase === base
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-700 border-slate-300 hover:border-brand hover:text-brand"
                }`}
              >
                {base}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedBase && variantsForBase.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Versión</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-auto pr-1">
            {variantsForBase.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => onChange(variant)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  value === variant
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-700"
                }`}
              >
                {variant.replace(`${selectedBrand} `, "")}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Equipos rápidos</p>
        <div className="flex flex-wrap gap-2">
          {topQuickDevices.map((device) => (
            <button
              key={device}
              type="button"
              onClick={() => onChange(device)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:border-brand hover:text-brand"
            >
              {device}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          O escribir manualmente
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ej: iPhone 12 Pro Max"
          className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white"
          required={required}
          autoComplete="off"
        />
      </div>
    </div>
  );
}