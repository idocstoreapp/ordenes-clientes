import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types";
import { countries, getCountryByDialCode, type Country } from "@/lib/countries";

interface CustomerEditModalProps {
  customer: Customer;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export default function CustomerEditModal({ customer, onClose, onSave }: CustomerEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: customer.name || "",
    email: customer.email || "",
    phone: customer.phone || "",
    phoneCountryCode: customer.phone_country_code || "+56",
    rutDocument: customer.rut_document || "",
    address: customer.address || "",
  });

  // Cerrar dropdown de país al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSave() {
    if (!formData.name || !formData.email || !formData.phone) {
      alert("Por favor completa nombre, email y teléfono");
      return;
    }

    setLoading(true);
    try {
      // Preparar datos de actualización
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        phone_country_code: formData.phoneCountryCode,
        rut_document: formData.rutDocument?.trim() || null,
        address: formData.address?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log("[CustomerEditModal] Actualizando cliente:", customer.id, updateData);

      // Hacer el update con select para obtener el resultado directamente
      const { data: updatedCustomer, error: updateError } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customer.id)
        .select()
        .maybeSingle();

      if (updateError) {
        console.error("[CustomerEditModal] Error actualizando cliente:", updateError);
        alert(`Error al actualizar cliente: ${updateError.message}`);
        setLoading(false);
        return;
      }

      if (!updatedCustomer) {
        console.error("[CustomerEditModal] No se obtuvo cliente actualizado después del update");
        // Intentar obtener el cliente nuevamente como fallback
        const { data: fallbackCustomer, error: selectError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", customer.id)
          .maybeSingle();

        if (selectError || !fallbackCustomer) {
          alert("Error: No se pudo obtener el cliente actualizado. Por favor, recarga la página.");
          setLoading(false);
          return;
        }

        // Usar el cliente del fallback
        console.log("[CustomerEditModal] Usando cliente del fallback:", fallbackCustomer);
        onSave(fallbackCustomer);
        onClose();
        return;
      }

      console.log("[CustomerEditModal] Cliente actualizado exitosamente:", updatedCustomer);
      onSave(updatedCustomer);
      onClose();
    } catch (error: any) {
      console.error("Error inesperado:", error);
      alert(`Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCountrySelect(country: Country) {
    setFormData({ ...formData, phoneCountryCode: country.dialCode });
    setShowCountryDropdown(false);
  }

  const selectedCountry = getCountryByDialCode(formData.phoneCountryCode) || countries[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Editar Cliente</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono *</label>
                <div className="flex gap-2">
                  <div className="relative" ref={countryDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="flex items-center gap-2 w-28 border border-slate-300 rounded-md px-2 py-2 bg-white hover:bg-slate-50"
                    >
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span className="text-sm">{selectedCountry.dialCode}</span>
                      <span className="ml-auto text-xs">▼</span>
                    </button>
                    {showCountryDropdown && (
                      <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {countries.map((country) => (
                          <button
                            key={country.code}
                            type="button"
                            onClick={() => handleCountrySelect(country)}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 ${
                              country.dialCode === formData.phoneCountryCode ? "bg-brand-light bg-opacity-10" : ""
                            }`}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="flex-1 text-sm">{country.name}</span>
                            <span className="text-sm text-slate-600">{country.dialCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    className="flex-1 border border-slate-300 rounded-md px-3 py-2"
                    placeholder="Ej: 912345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RUT/Documento</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.rutDocument}
                  onChange={(e) => setFormData({ ...formData, rutDocument: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

