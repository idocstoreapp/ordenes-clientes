import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { OrderNote, User } from "@/types";
import { formatDateTime } from "@/lib/date";
import type { WorkOrder, Customer, Branch } from "@/types";

interface OrderNotesProps {
  orderId: string;
  order: WorkOrder & { customer?: Customer; sucursal?: Branch | null };
  currentUserId?: string;
}

export default function OrderNotes({ orderId, order, currentUserId }: OrderNotesProps) {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [orderId]);

  function isMissingWorkOrderNotesTable(error: any) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("work_order_notes") && (
      message.includes("could not find the table") ||
      message.includes("schema cache") ||
      message.includes("does not exist")
    );
  }

  async function loadNotesFromTable(tableName: "work_order_notes" | "order_notes") {
    // Primero intentar cargar las notas con la relación a users
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        *,
        user:users(id, name, email)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (!error) {
      setNotes(data || []);
      return;
    }

    // Si falla la relación, intentar sin la relación
    const { data: notesData, error: notesError } = await supabase
      .from(tableName)
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (notesError) throw notesError;

    // Cargar usuarios manualmente si es necesario
    const notesWithUsers = await Promise.all(
      (notesData || []).map(async (note: any) => {
        if (note.user_id) {
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("id, name, email")
              .eq("id", note.user_id)
              .single();
            return { ...note, user: userData || null };
          } catch {
            return { ...note, user: null };
          }
        }
        return { ...note, user: null };
      })
    );

    setNotes(notesWithUsers);
  }

  async function loadNotes() {
    setLoading(true);
    try {
      try {
        await loadNotesFromTable("work_order_notes");
      } catch (error: any) {
        if (!isMissingWorkOrderNotesTable(error)) throw error;
        await loadNotesFromTable("order_notes");
      }
    } catch (error: any) {
      console.error("Error cargando notas:", error);
      alert(`Error al cargar las notas: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) {
      alert("Por favor escribe una nota");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        order_id: orderId,
        user_id: currentUserId || null,
        note: newNote.trim(),
        note_type: isPublic ? "publico" : "interno",
      };
      let error: any = null;

      const tryNewTable = await supabase
        .from("work_order_notes")
        .insert(payload);

      error = tryNewTable.error;

      if (error && isMissingWorkOrderNotesTable(error)) {
        const fallback = await supabase
          .from("order_notes")
          .insert(payload);
        error = fallback.error;
      }

      if (error) throw error;

      setNewNote("");
      setIsPublic(true);
      await loadNotes();
    } catch (error: any) {
      console.error("Error guardando nota:", error);
      alert(`Error al guardar la nota: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSendNoteWhatsApp(note: OrderNote) {
    if (!order.customer) {
      alert("No hay información del cliente");
      return;
    }

    try {
      // Preparar número de teléfono
      const phone = order.customer.phone_country_code
        ? order.customer.phone_country_code.replace("+", "") + order.customer.phone.replace(/\D/g, "")
        : "56" + order.customer.phone.replace(/\D/g, "");

      // Mensaje para WhatsApp con la nota incluida
      const message = encodeURIComponent(
        `Hola ${order.customer.name},\n\nTengo una actualización sobre tu orden ${order.order_number}:\n\n${note.note}\n\nSaludos,\niDocStore`
      );

      // Abrir WhatsApp Web con el mensaje
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
    } catch (error) {
      console.error("Error enviando nota por WhatsApp:", error);
      alert("Error al enviar la nota por WhatsApp");
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("¿Estás seguro de eliminar esta nota?")) return;

    try {
      let { error } = await supabase
        .from("work_order_notes")
        .delete()
        .eq("id", noteId);

      if (error && isMissingWorkOrderNotesTable(error)) {
        const fallback = await supabase
          .from("order_notes")
          .delete()
          .eq("id", noteId);
        error = fallback.error;
      }

      if (error) throw error;
      await loadNotes();
    } catch (error: any) {
      console.error("Error eliminando nota:", error);
      alert(`Error al eliminar la nota: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="p-4 border border-slate-200 rounded-md">
        <p className="text-slate-600">Cargando notas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Notas de la Orden</h3>

      {/* Formulario para nueva nota */}
      <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
        <textarea
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-3"
          rows={4}
          placeholder="Escribe una nota..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 text-brand-light rounded focus:ring-brand-light"
            />
            <span className="text-sm text-slate-700">
              Nota pública (se puede enviar al cliente)
            </span>
          </label>
          <button
            onClick={handleAddNote}
            disabled={saving || !newNote.trim()}
            className="px-4 py-2 bg-brand-light text-white rounded-md hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Agregar Nota"}
          </button>
        </div>
      </div>

      {/* Lista de notas */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay notas para esta orden</p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`border rounded-md p-4 ${
                note.note_type === "publico"
                  ? "border-green-200 bg-green-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        note.note_type === "publico"
                          ? "bg-green-200 text-green-800"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {note.note_type === "publico" ? "Pública" : "Privada"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(note.created_at)}
                    </span>
                    {(note.user as User)?.name && (
                      <span className="text-xs text-slate-500">
                        por {(note.user as User).name}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-900 whitespace-pre-wrap">{note.note}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  {note.note_type === "publico" && order.customer && (
                    <button
                      onClick={() => handleSendNoteWhatsApp(note)}
                      className="px-3 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600"
                      title="Enviar por WhatsApp"
                    >
                      📱 WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="px-3 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                    title="Eliminar nota"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
