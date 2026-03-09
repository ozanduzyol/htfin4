import React, { useState, useMemo, useEffect } from "react";

const SUPABASE_URL = "https://abvweewmftvlvdtchfge.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidndlZXdtZnR2bHZkdGNoZmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODIzNjcsImV4cCI6MjA4ODU1ODM2N30.60tQAbY--AId81ORDydoiBt5TsvEPut8OfkMKyNSALc";
const HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

const CATEGORIES = [
  { id: "market", label: "Market", icon: "🛒", color: "#4CAF50" },
  { id: "fatura", label: "Fatura", icon: "💡", color: "#FF9800" },
  { id: "ulasim", label: "Ulaşım", icon: "🚌", color: "#2196F3" },
  { id: "saglik", label: "Sağlık", icon: "💊", color: "#F44336" },
  { id: "yemek", label: "Yemek", icon: "🍽️", color: "#9C27B0" },
  { id: "giyim", label: "Giyim", icon: "👗", color: "#E91E63" },
  { id: "eglence", label: "Eğlence", icon: "🎬", color: "#00BCD4" },
  { id: "diger", label: "Diğer", icon: "📦", color: "#607D8B" },
];

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const now = new Date();


const C = {
  bg: "#0a0a0f", card: "#13131a", card2: "#1a1a24", border: "#2a2a3a",
  accent: "#7c5cbf", accentLight: "#a07dd6", text: "#e8e4f0", muted: "#6b6880", subtle: "#3a3a4a",
};

const inp = {
  width: "100%", padding: "14px", borderRadius: 14, border: `1px solid ${C.border}`,
  background: C.card2, color: C.text, fontFamily: "inherit", fontSize: 15,
  outline: "none", boxSizing: "border-box",
};

// Supabase API fonksiyonları
async function dbGetAll() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/harcamalar?order=created_at.aciklama`, { headers: HEADERS });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function dbInsert(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/harcamalar`, {
    method: "POST", headers: { ...HEADERS, "Prefer": "return=representation" },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  return json[0];
}

async function dbUpdate(id, data) {
  await fetch(`${SUPABASE_URL}/rest/v1/harcamalar?id=eq.${id}`, {
    method: "PATCH", headers: HEADERS, body: JSON.stringify(data)
  });
}

async function dbDelete(id) {
  await fetch(`${SUPABASE_URL}/rest/v1/harcamalar?id=eq.${id}`, {
    method: "DELETE", headers: HEADERS
  });
}

async function uploadFile(file) {
  try {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/Faturalar/${fileName}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": file.type,
        "x-upsert": "true"
      },
      body: file
    });
    
    const responseText = await res.text();
    console.log("Upload status:", res.status);
    console.log("Upload response:", responseText);
    
    if (!res.ok) {
      showToast(`Hata: ${res.status}`, "#F44336");
      return null;
    }
    
    return `${SUPABASE_URL}/storage/v1/object/public/Faturalar/${fileName}`;
  } catch (err) {
    console.log("Upload exception:", err.message);
    showToast(`Hata: ${err.message}`, "#F44336");
    return null;
  }
}

const TABS = [
  { id: "add", icon: "➕", label: "Ekle" },
  { id: "list", icon: "📋", label: "Liste" },
  { id: "chart", icon: "📊", label: "Özet" },
  { id: "backup", icon: "💾", label: "Yedek" },
];

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ desc: "", amount: "", category: "market", month: now.getMonth(), year: now.getFullYear(), tarih: now.toISOString().split("T")[0] });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [tab, setTab] = useState("add");
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  useEffect(() => { loadExpenses(); }, []);

  async function loadExpenses() {
    setLoading(true);
    const data = await dbGetAll();
    setExpenses(data);
    setLoading(false);
  }  

  function showToast(msg, color = "#4CAF50") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview("pdf");
    }
  }

  async function handleSave() {
    const amountNum = Number(form.amount.toString().replace(/\./g, "").replace(",", "."));
    if (!form.aciklama.trim() || !form.amount || isNaN(amountNum) || amountNum <= 0) {
      showToast("Tüm alanları doldurun", "#F44336"); return;
    }

    setUploading(true);
    let dosya_url = editId ? expenses.find(e => e.id === editId)?.dosya_url : null;
    let dosya_tur = editId ? expenses.find(e => e.id === editId)?.dosya_tur : null;

    if (selectedFile) {
      dosya_url = await uploadFile(selectedFile);
      dosya_tur = selectedFile.type.startsWith("image/") ? "image" : "pdf";
      if (!dosya_url) { showToast("Dosya yüklenemedi", "#F44336"); setUploading(false); return; }
    }

    const payload = { aciklama: form.aciklama, amount: amountNum, category: form.category, month: form.month, year: form.year, tarih: form.tarih, dosya_url, dosya_tur };

    try {
      if (editId) {
        await dbUpdate(editId, payload);
        setExpenses(p => p.map(e => e.id === editId ? { ...e, ...payload } : e));
        setEditId(null);
        showToast("Güncellendi ✓");
      } else {
        const newExp = await dbInsert(payload);
        setExpenses(p => [newExp, ...p]);
        showToast("Kaydedildi ✓");
      }
      setForm(f => ({ ...f, aciklama: "", amount: "" }));
      setSelectedFile(null); setFilePreview(null);
    } catch { showToast("Kayıt hatası", "#F44336"); }
    setUploading(false);
  }

  function handleEdit(exp) {
    setForm({ aciklama: exp.aciklama, amount: String(exp.amount), category: exp.category, month: exp.month, year: exp.year });
    setEditId(exp.id); setSelectedFile(null); setFilePreview(null); setTab("add");
  }

  async function handleDelete(id) {
    await dbDelete(id);
    setExpenses(p => p.filter(e => e.id !== id));
    showToast("Silindi", "#FF9800");
  }

  const filtered = useMemo(() =>
    expenses.filter(e => e.month === filterMonth && e.year === filterYear),
    [expenses, filterMonth, filterYear]
  );

  const totalByCategory = useMemo(() => {
    const map = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return map;
  }, [filtered]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const maxCat = Object.values(totalByCategory).reduce((a, b) => Math.max(a, b), 0);

  function exportCSV() {
    const rows = [["Açıklama","Kategori","Tutar","Ay","Yıl","Dosya"]];
    filtered.forEach(e => {
      const c = CATEGORIES.find(c => c.id === e.category);
      rows.push([e.aciklama, c?.label || e.category, e.amount, MONTHS[e.month], e.year, e.dosya_url || ""]);
    });
    const csv = "\uFEFF" + rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `harcamalar_${MONTHS[filterMonth]}_${filterYear}.csv`;
    a.click();
    showToast("CSV indirildi ✓");
  }

  const cat = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[7];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Georgia', serif", paddingBottom: 80 }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "#fff", padding: "10px 24px",
          borderRadius: 30, fontSize: 13, fontWeight: "bold", zIndex: 9999,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", whiteSpace: "nowrap"
        }}>{toast.msg}</div>
      )}

      {/* Dosya Önizleme Modal */}
      {previewUrl && (
        <div onClick={() => setPreviewUrl(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
          zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          {previewUrl === "pdf" ? (
            <div style={{ color: "#fff", textAlign: "center" }}>
              <div style={{ fontSize: 60 }}>📄</div>
              <div style={{ marginTop: 12 }}>PDF önizleme desteklenmiyor</div>
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: C.accentLight }}>Aç</a>
            </div>
          ) : (
            <img src={previewUrl} alt="fatura" style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12 }} />
          )}
          <button onClick={() => setPreviewUrl(null)} style={{
            position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)",
            border: "none", color: "#fff", fontSize: 24, cursor: "pointer", borderRadius: 50, width: 40, height: 40
          }}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{
        background: C.card, borderBottom: `1px solid ${C.border}`,
        padding: "20px 20px 16px", textAlign: "center",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: C.accent, textTransform: "uppercase", marginBottom: 4 }}>Aylık</div>
        <div style={{ fontSize: 24, fontWeight: "bold" }}>Harcama Takibi</div>
      </div>

      <div style={{ padding: "16px 16px 0", margin: "0 auto" }}>

        {(tab === "list" || tab === "chart" || tab === "backup") && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} style={{ ...inp, flex: 1 }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} style={{ ...inp, width: 88 }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {/* ADD TAB */}
        {tab === "add" && (
          <div style={{ background: C.card, borderRadius: 20, padding: "20px 16px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 16 }}>
              {editId ? "Düzenle" : "Yeni Harcama"}
            </div>

            <input value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))}
              placeholder="Açıklama" style={{ ...inp, marginBottom: 10 }} />
            <input value={(() => {if (!form.amount) return "";
              const parts = form.amount.toString().split(",");
              const intPart = Number(parts[0] || 0).toLocaleString("tr-TR");
                return parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
              })()}
  onChange={e => {
    const raw = e.target.value.replace(/\./g, "").replace(/[^0-9,]/g, "");
    const parts = raw.split(",");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setForm(f => ({ ...f, amount: raw }));
  }}
  placeholder="Tutar (₺)"
  inputMode="decimal"
  style={{ ...inp, marginBottom: 10 }}
/>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <select value={form.month} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))} style={{ ...inp, flex: 1 }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} style={{ ...inp, width: 88 }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <input
                type="date"
                value={form.tarih}
                onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid #2a2a3a",
                  background: "#1a1a24",
                  color: "#e8e4f0",
                  fontFamily: "inherit",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                  appearance: "none",
                  height: 44
                }}
              />
          </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))} style={{
                  padding: "10px 4px", borderRadius: 12,
                  border: form.category === c.id ? `2px solid ${c.color}` : `2px solid transparent`,
                  background: form.category === c.id ? `${c.color}20` : C.card2,
                  cursor: "pointer", textAlign: "center", color: C.text, fontFamily: "inherit",
                }}>
                  <div style={{ fontSize: 22 }}>{c.icon}</div>
                  <div style={{ fontSize: 10, marginTop: 3, color: form.category === c.id ? c.color : C.muted }}>{c.label}</div>
                </button>
              ))}
            </div>

            {/* Dosya Yükleme */}
            <label style={{
              display: "block", padding: 14, borderRadius: 14, marginBottom: 10,
              border: `1px dashed ${filePreview ? C.accent : C.border}`,
              background: filePreview ? `${C.accent}10` : C.card2,
              cursor: "pointer", textAlign: "center", color: C.muted
            }}>
              {filePreview ? (
                filePreview === "pdf" ? (
                  <div style={{ color: C.accentLight }}>📄 PDF seçildi</div>
                ) : (
                  <img src={filePreview} alt="önizleme" style={{ maxHeight: 120, borderRadius: 8, maxWidth: "100%" }} />
                )
              ) : (
                <div>📎 Fatura / Fiş ekle<br /><span style={{ fontSize: 11 }}>JPG, PNG veya PDF</span></div>
              )}
              <input type="file" accept="image/*,.pdf" onChange={handleFileSelect} style={{ display: "none" }} />
            </label>

            {filePreview && (
              <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} style={{
                width: "100%", marginBottom: 10, padding: 10, borderRadius: 12,
                border: `1px solid ${C.border}`, background: "transparent",
                color: C.muted, fontFamily: "inherit", fontSize: 13, cursor: "pointer"
              }}>✕ Dosyayı kaldır</button>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSave} disabled={uploading} style={{
                flex: 1, padding: 14, borderRadius: 14, border: "none",
                background: uploading ? C.subtle : `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
                color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: "bold", cursor: uploading ? "not-allowed" : "pointer"
              }}>{uploading ? "Yükleniyor..." : editId ? "Güncelle" : "Kaydet"}</button>
              {editId && (
                <button onClick={() => { setEditId(null); setForm(f => ({ ...f, aciklama: "", amount: "" })); setSelectedFile(null); setFilePreview(null); }} style={{
                  padding: "14px 18px", borderRadius: 14, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, fontFamily: "inherit", cursor: "pointer"
                }}>İptal</button>
              )}
            </div>
          </div>
        )}

        {/* LIST TAB */}
        {tab === "list" && (
          <div>
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Bu ay harcama yok.</div>
            ) : (
              <>
                <div style={{ padding: "12px 16px", background: `${C.accent}22`, borderRadius: 14, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: C.accentLight, fontSize: 13 }}>Toplam</span>
                  <span style={{ fontWeight: "bold", fontSize: 20 }}>₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {filtered.map(e => {
                  const c = cat(e.category);
                  return (
                    <div key={e.id} style={{
                      background: C.card, borderRadius: 16, padding: "14px",
                      marginBottom: 8, border: `1px solid ${C.border}`
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: `${c.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
                        }}>{c.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "bold", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.aciklama}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{c.label} · {e.tarih ? new Date(e.tarih).toLocaleDateString("tr-TR") : ""}</div>
                        </div>
                        <div style={{ fontWeight: "bold", color: c.color, fontSize: 15, flexShrink: 0 }}>
                          ₺{Number(e.amount).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <button onClick={() => handleEdit(e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }}>✏️</button>
                        <button onClick={() => handleDelete(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4 }}>🗑️</button>
                      </div>

                      {/* Dosya göster */}
                      {e.dosya_url && (
                        <div style={{ marginTop: 10 }}>
                          {e.dosya_tur === "image" ? (
                            <img
                              src={e.dosya_url} alt="fatura"
                              onClick={() => setPreviewUrl(e.dosya_url)}
                              style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, cursor: "pointer" }}
                            />
                          ) : (
                            <a href={e.dosya_url} target="_blank" rel="noreferrer" style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                              background: C.card2, borderRadius: 10, color: C.accentLight,
                              textDecoration: "none", fontSize: 13
                            }}>
                              📄 <span>Faturayı görüntüle (PDF)</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={exportCSV} style={{
                  width: "100%", marginTop: 4, padding: 14, borderRadius: 14,
                  border: `1px solid rgba(76,175,80,0.3)`, background: "rgba(76,175,80,0.08)",
                  color: "#4CAF50", fontFamily: "inherit", fontSize: 14, cursor: "pointer", fontWeight: "bold"
                }}>📥 CSV İndir</button>
              </>
            )}
          </div>
        )}

        {/* CHART TAB */}
        {tab === "chart" && (
          <div>
            <div style={{ padding: "12px 16px", background: `${C.accent}22`, borderRadius: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.accentLight, fontSize: 13 }}>Toplam</span>
              <span style={{ fontWeight: "bold", fontSize: 20 }}>₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {Object.keys(totalByCategory).length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: C.muted }}>Bu ay veri yok.</div>
            ) : CATEGORIES.map(c => {
              const amt = totalByCategory[c.id] || 0;
              if (!amt) return null;
              const pct = total > 0 ? (amt / total) * 100 : 0;
              const barW = maxCat > 0 ? (amt / maxCat) * 100 : 0;
              return (
                <div key={c.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                    <span>{c.icon} {c.label}</span>
                    <span style={{ color: c.color, fontWeight: "bold" }}>
                      ₺{amt.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span style={{ color: C.muted, fontWeight: "normal" }}> %{pct.toFixed(1)}</span>
                    </span>
                  </div>
                  <div style={{ background: C.subtle, borderRadius: 8, height: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${barW}%`, borderRadius: 8, background: c.color, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BACKUP TAB */}
        {tab === "backup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={exportCSV} style={{
              padding: 16, borderRadius: 14, border: `1px solid rgba(76,175,80,0.3)`,
              background: "rgba(76,175,80,0.08)", color: "#4CAF50",
              fontFamily: "inherit", fontSize: 15, cursor: "pointer", fontWeight: "bold"
            }}>📊 CSV İndir — {MONTHS[filterMonth]} {filterYear}</button>
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "8px 0" }}>
              ☁️ Veriler Supabase'de güvenle saklanıyor
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.card, borderTop: `1px solid ${C.border}`,
        display: "flex", zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom)"
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 4px", border: "none", cursor: "pointer",
            background: "transparent", fontFamily: "inherit",
            color: tab === t.id ? C.accentLight : C.muted,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.id ? "bold" : "normal" }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
