import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getSystemSettings, clearSettingsCache, type SystemSettings } from "@/lib/settings";
import ChecklistEditor from "./ChecklistEditor";
import ServicesEditor from "./ServicesEditor";

type TabType = "logos" | "checklists" | "services" | "warranties";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>("logos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [headerLogoFile, setHeaderLogoFile] = useState<File | null>(null);
  const [pdfLogoFile, setPdfLogoFile] = useState<File | null>(null);
  const [headerLogoPreview, setHeaderLogoPreview] = useState<string>("");
  const [pdfLogoPreview, setPdfLogoPreview] = useState<string>("");
  
  const [settings, setSettings] = useState<SystemSettings>({
    header_logo: { url: "/logo.png", width: 128, height: 128 },
    pdf_logo: { url: "/logo.png", width: 33, height: 22 },
    warranty_policies: {
      policies: [
        "• Garantía 30 días por defectos de mano de obra y repuestos.",
        "• NO cubre daños por mal uso, golpes, caídas o líquidos.",
        "• Presentar boleta o factura para hacer efectiva la garantía.",
        "• Cualquier reparación por terceros anula la garantía.",
      ],
    },
  });

  const headerLogoInputRef = useRef<HTMLInputElement>(null);
  const pdfLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const loadedSettings = await getSystemSettings();
      setSettings(loadedSettings);
      
      // Cargar previews de logos actuales
      if (loadedSettings.header_logo?.url) {
        setHeaderLogoPreview(loadedSettings.header_logo.url);
      }
      if (loadedSettings.pdf_logo?.url) {
        setPdfLogoPreview(loadedSettings.pdf_logo.url);
      }
    } catch (error) {
      console.error("Error cargando configuraciones:", error);
      alert("Error al cargar las configuraciones");
    } finally {
      setLoading(false);
    }
  }

  async function handleHeaderLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setHeaderLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handlePdfLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPdfLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function uploadLogo(file: File): Promise<string> {
    // Guardar como data URL directamente en la configuración
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Subir logos si hay archivos nuevos
      let headerLogoUrl = settings.header_logo.url;
      let pdfLogoUrl = settings.pdf_logo.url;

      if (headerLogoFile) {
        headerLogoUrl = await uploadLogo(headerLogoFile, "header");
      }
      if (pdfLogoFile) {
        pdfLogoUrl = await uploadLogo(pdfLogoFile, "pdf");
      }

      // Actualizar configuraciones
      const updates = [
        {
          setting_key: "header_logo",
          setting_value: {
            url: headerLogoUrl,
            width: settings.header_logo.width,
            height: settings.header_logo.height,
          },
        },
        {
          setting_key: "pdf_logo",
          setting_value: {
            url: pdfLogoUrl,
            width: settings.pdf_logo.width,
            height: settings.pdf_logo.height,
          },
        },
        {
          setting_key: "warranty_policies",
          setting_value: settings.warranty_policies,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            {
              setting_key: update.setting_key,
              setting_value: update.setting_value,
            },
            { onConflict: "setting_key" }
          );

        if (error) throw error;
      }

      // Limpiar caché para que los cambios se reflejen
      clearSettingsCache();
      
      alert("Configuraciones guardadas exitosamente. Es posible que necesites recargar la página para ver los cambios.");
      
      // Resetear archivos
      setHeaderLogoFile(null);
      setPdfLogoFile(null);
      if (headerLogoInputRef.current) headerLogoInputRef.current.value = "";
      if (pdfLogoInputRef.current) pdfLogoInputRef.current.value = "";
      
      // Recargar configuración
      await loadSettings();
    } catch (error: any) {
      console.error("Error guardando configuraciones:", error);
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function addWarrantyPolicy() {
    setSettings({
      ...settings,
      warranty_policies: {
        policies: [...settings.warranty_policies.policies, ""],
      },
    });
  }

  function removeWarrantyPolicy(index: number) {
    setSettings({
      ...settings,
      warranty_policies: {
        policies: settings.warranty_policies.policies.filter((_, i) => i !== index),
      },
    });
  }

  function updateWarrantyPolicy(index: number, value: string) {
    const newPolicies = [...settings.warranty_policies.policies];
    newPolicies[index] = value;
    setSettings({
      ...settings,
      warranty_policies: {
        policies: newPolicies,
      },
    });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-slate-600">Cargando configuraciones...</p>
      </div>
    );
  }

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: "logos", label: "Logos", icon: "🖼️" },
    { id: "checklists", label: "Checklists", icon: "✓" },
    { id: "services", label: "Servicios", icon: "🔧" },
    { id: "warranties", label: "Garantías", icon: "🛡️" },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-6">Configuración del Sistema</h2>

      {/* Pestañas */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${
                  activeTab === tab.id
                    ? "bg-brand-light text-white border-b-2 border-brand-dark"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de las pestañas */}
      <div className="min-h-[400px]">
        {/* Pestaña: Logos */}
        {activeTab === "logos" && (
          <div className="space-y-8">
            {/* Logo del Header */}
            <div className="border-b border-slate-200 pb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Logo del Header</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo (Archivo)
              </label>
              <input
                ref={headerLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleHeaderLogoChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-white hover:file:bg-brand-dark"
              />
              {headerLogoPreview && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">Vista previa:</p>
                  <img
                    src={headerLogoPreview}
                    alt="Header logo preview"
                    className="border border-slate-300 rounded-md p-2"
                    style={{
                      maxHeight: `${settings.header_logo.height}px`,
                      maxWidth: `${settings.header_logo.width}px`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ancho (píxeles)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={settings.header_logo.width}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header_logo: {
                        ...settings.header_logo,
                        width: parseInt(e.target.value) || 128,
                      },
                    })
                  }
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alto (píxeles)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={settings.header_logo.height}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      header_logo: {
                        ...settings.header_logo,
                        height: parseInt(e.target.value) || 128,
                      },
                    })
                  }
                  min="1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Logo del PDF */}
        <div className="border-b border-slate-200 pb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Logo del PDF</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo (Archivo)
              </label>
              <input
                ref={pdfLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePdfLogoChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-white hover:file:bg-brand-dark"
              />
              {pdfLogoPreview && (
                <div className="mt-4">
                  <p className="text-sm text-slate-600 mb-2">Vista previa:</p>
                  <img
                    src={pdfLogoPreview}
                    alt="PDF logo preview"
                    className="border border-slate-300 rounded-md p-2"
                    style={{
                      maxHeight: `${settings.pdf_logo.height}px`,
                      maxWidth: `${settings.pdf_logo.width}px`,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Ancho (puntos)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={settings.pdf_logo.width}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pdf_logo: {
                        ...settings.pdf_logo,
                        width: parseInt(e.target.value) || 33,
                      },
                    })
                  }
                  min="1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alto (puntos)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                  value={settings.pdf_logo.height}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pdf_logo: {
                        ...settings.pdf_logo,
                        height: parseInt(e.target.value) || 22,
                      },
                    })
                  }
                  min="1"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </div>
          </div>
        )}

        {/* Pestaña: Checklists */}
        {activeTab === "checklists" && (
          <div>
            <ChecklistEditor />
          </div>
        )}

        {/* Pestaña: Servicios */}
        {activeTab === "services" && (
          <div>
            <ServicesEditor />
          </div>
        )}

        {/* Pestaña: Garantías */}
        {activeTab === "warranties" && (
          <div>
            {/* Políticas de Garantía */}
            <div className="pb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Políticas de Garantía</h3>
                <button
                  onClick={addWarrantyPolicy}
                  className="px-3 py-1 text-sm bg-brand-light text-white rounded-md hover:bg-brand-dark"
                >
                  + Agregar Política
                </button>
              </div>

              <div className="space-y-3">
                {settings.warranty_policies.policies.map((policy, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-slate-300 rounded-md px-3 py-2"
                      value={policy}
                      onChange={(e) => updateWarrantyPolicy(index, e.target.value)}
                      placeholder="Escribe una política de garantía..."
                    />
                    <button
                      onClick={() => removeWarrantyPolicy(index)}
                      className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                      disabled={settings.warranty_policies.policies.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botón Guardar (solo visible en pestañas que requieren guardado) */}
      {(activeTab === "logos" || activeTab === "warranties") && (
        <div className="flex justify-end mt-6 pt-6 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      )}
    </div>
  );
}

