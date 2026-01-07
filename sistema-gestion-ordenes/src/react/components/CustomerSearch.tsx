import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types";
import { countries, getCountryByDialCode, type Country } from "@/lib/countries";

interface CustomerSearchProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

export default function CustomerSearch({ selectedCustomer, onCustomerSelect }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Formulario nuevo cliente
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    phoneCountryCode: "+56",
    rutDocument: "",
    address: "",
  });

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.length >= 2 && !showForm) {
        searchCustomers();
      } else {
        setCustomers([]);
        setShowResults(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(delaySearch);
  }, [searchTerm, showForm]);

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

  async function searchCustomers() {
    if (!searchTerm || searchTerm.length < 2) {
      setCustomers([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      // Usar múltiples consultas para evitar problemas con .or()
      const searchPattern = `%${searchTerm}%`;
      
      // Consulta 1: Por nombre
      const { data: nameData } = await supabase
        .from("customers")
        .select("*")
        .ilike("name", searchPattern)
        .limit(10);

      // Consulta 2: Por email (si no se encontró por nombre)
      const { data: emailData } = await supabase
        .from("customers")
        .select("*")
        .ilike("email", searchPattern)
        .limit(10);

      // Consulta 3: Por teléfono (si no se encontró por nombre ni email)
      const { data: phoneData } = await supabase
        .from("customers")
        .select("*")
        .ilike("phone", searchPattern)
        .limit(10);

      // Combinar resultados únicos
      const allResults = [
        ...(nameData || []),
        ...(emailData || []),
        ...(phoneData || [])
      ];

      // Filtrar duplicados por ID
      const uniqueCustomers = Array.from(
        new Map(allResults.map((c) => [c.id, c])).values()
      ).slice(0, 10);

      setCustomers(uniqueCustomers);
      setShowResults(uniqueCustomers.length > 0);
    } catch (error) {
      console.error("Error en búsqueda:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCustomer(e?: React.MouseEvent<HTMLButtonElement>) {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevenir que se propague al formulario padre
    }

    if (!newCustomer.name || !newCustomer.email || !newCustomer.phone) {
      alert("Por favor completa nombre, email y teléfono");
      return;
    }

    setLoading(true);
    try {
      const email = newCustomer.email.trim().toLowerCase();
      const phone = newCustomer.phone.trim();

      // Primero verificar si ya existe un cliente con ese email y teléfono
      const { data: existingCustomer, error: searchError } = await supabase
        .from("customers")
        .select("*")
        .eq("email", email)
        .eq("phone", phone)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error buscando cliente:", searchError);
        throw searchError;
      }

      let customerData;

      if (existingCustomer) {
        // Si el cliente ya existe, usar el existente
        // Pero actualizar los campos que puedan haber cambiado (nombre, dirección, RUT)
        const updates: any = {};
        if (newCustomer.name.trim() !== existingCustomer.name) {
          updates.name = newCustomer.name.trim();
        }
        if (newCustomer.address?.trim() && newCustomer.address.trim() !== existingCustomer.address) {
          updates.address = newCustomer.address.trim();
        }
        if (newCustomer.rutDocument?.trim() && newCustomer.rutDocument.trim() !== existingCustomer.rut_document) {
          updates.rut_document = newCustomer.rutDocument.trim();
        }

        if (Object.keys(updates).length > 0) {
          // Actualizar solo si hay cambios
          const { data: updatedCustomer, error: updateError } = await supabase
            .from("customers")
            .update(updates)
            .eq("id", existingCustomer.id)
            .select()
            .single();

          if (updateError) {
            console.error("Error actualizando cliente:", updateError);
            // Si falla la actualización, usar el cliente existente tal cual
            customerData = existingCustomer;
          } else {
            customerData = updatedCustomer;
          }
        } else {
          customerData = existingCustomer;
        }
      } else {
        // Si no existe, crear el nuevo cliente
        const { data, error } = await supabase
          .from("customers")
          .insert({
            name: newCustomer.name.trim(),
            email: email,
            phone: phone,
            phone_country_code: newCustomer.phoneCountryCode,
            rut_document: newCustomer.rutDocument?.trim() || null,
            address: newCustomer.address?.trim() || null,
          })
          .select()
          .single();

        if (error) {
          // Si el error es por duplicado, intentar buscar el cliente nuevamente
          if (error.code === '23505' || error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
            const { data: foundCustomer, error: findError } = await supabase
              .from("customers")
              .select("*")
              .eq("email", email)
              .eq("phone", phone)
              .maybeSingle();

            if (findError || !foundCustomer) {
              console.error("Error creando cliente:", error);
              alert(`Error al crear cliente: ${error.message}`);
              setLoading(false);
              return;
            }

            customerData = foundCustomer;
          } else {
            console.error("Error creando cliente:", error);
            alert(`Error al crear cliente: ${error.message}`);
            setLoading(false);
            return;
          }
        } else {
          customerData = data;
        }
      }

      if (customerData) {
        onCustomerSelect(customerData);
        setShowForm(false);
        setSearchTerm(customerData.name);
        setCustomers([]);
        setShowResults(false);
        setNewCustomer({
          name: "",
          email: "",
          phone: "",
          phoneCountryCode: "+56",
          rutDocument: "",
          address: "",
        });
      }
    } catch (error: any) {
      console.error("Error inesperado:", error);
      alert(`Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCountrySelect(country: Country) {
    setNewCustomer({ ...newCustomer, phoneCountryCode: country.dialCode });
    setShowCountryDropdown(false);
  }

  const selectedCountry = getCountryByDialCode(newCustomer.phoneCountryCode) || countries[0];

  return (
    <div className="relative">
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
          <div>
            <p className="font-medium text-slate-900">{selectedCustomer.name}</p>
            <p className="text-sm text-slate-600">
              {selectedCustomer.email} • {getCountryByDialCode(selectedCustomer.phone_country_code || "+56")?.flag} {selectedCustomer.phone_country_code || "+56"} {selectedCustomer.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onCustomerSelect(null);
              setSearchTerm("");
            }}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-slate-300 rounded-md px-3 py-2"
              placeholder="Buscar cliente por nombre, email o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark"
            >
              + Nuevo
            </button>
          </div>

          {showResults && customers.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {customers.map((customer) => {
                const customerCountry = getCountryByDialCode(customer.phone_country_code || "+56");
                return (
                  <button
                    key={customer.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                    onClick={() => {
                      onCustomerSelect(customer);
                      setSearchTerm(customer.name);
                      setShowResults(false);
                      setCustomers([]);
                    }}
                  >
                    <p className="font-medium text-slate-900">{customer.name}</p>
                    <p className="text-sm text-slate-600">
                      {customer.email} • {customerCountry?.flag} {customer.phone_country_code || "+56"} {customer.phone}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          
          {showResults && searchTerm.length >= 2 && customers.length === 0 && !loading && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-4 text-center text-slate-600">
              No se encontraron clientes
            </div>
          )}

          {showForm && (
            <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50">
              <h4 className="font-semibold text-slate-900 mb-4">Nuevo Cliente</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
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
                                  country.dialCode === newCustomer.phoneCountryCode ? "bg-brand-light bg-opacity-10" : ""
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
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">RUT/Documento</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={newCustomer.rutDocument}
                      onChange={(e) => setNewCustomer({ ...newCustomer, rutDocument: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-md px-3 py-2"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateCustomer}
                    disabled={loading}
                    className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
                  >
                    {loading ? "Guardando..." : "Guardar Cliente"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

