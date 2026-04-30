import { useState, useEffect } from "react";

const CATEGORIES = ["All", "Perfume", "Home Care", "Raw Materials", "Packaging"];

const INITIAL_INVENTORY = [
  { id: 1, name: "Amber Dusk EDP", sku: "AD-EDP-50", category: "Perfume", unit: "bottle", quantity: 24, lowStock: 10, costPrice: 85, sellingPrice: 350, notes: "50ml · Warm oud unisex" },
  { id: 2, name: "BLVCK OUD EDP", sku: "BO-EDP-50", category: "Perfume", unit: "bottle", quantity: 8, lowStock: 10, costPrice: 95, sellingPrice: 420, notes: "50ml · Niche gentleman" },
  { id: 3, name: "Oud Bakhoor Chips", sku: "HC-OUD-250", category: "Home Care", unit: "pack", quantity: 40, lowStock: 15, costPrice: 30, sellingPrice: 120, notes: "250g resealable pack" },
  { id: 4, name: "Reed Diffuser – Amber", sku: "HC-RD-AMB", category: "Home Care", unit: "unit", quantity: 17, lowStock: 8, costPrice: 45, sellingPrice: 180, notes: "200ml · 8 reeds" },
  { id: 5, name: "Oud Attar (raw)", sku: "RM-OUD-ATT", category: "Raw Materials", unit: "ml", quantity: 500, lowStock: 100, costPrice: 2.5, sellingPrice: null, notes: "Cambodian origin" },
  { id: 6, name: "Amber Resinoid", sku: "RM-AMB-RES", category: "Raw Materials", unit: "g", quantity: 320, lowStock: 100, costPrice: 0.8, sellingPrice: null, notes: "Synthetic amber base" },
  { id: 7, name: "50ml Flacon Bottle", sku: "PK-FLC-50", category: "Packaging", unit: "unit", quantity: 60, lowStock: 20, costPrice: 12, sellingPrice: null, notes: "Black glass + gold cap" },
  { id: 8, name: "Gift Box – Black Kraft", sku: "PK-BOX-BLK", category: "Packaging", unit: "unit", quantity: 35, lowStock: 20, costPrice: 5, sellingPrice: null, notes: "Fits 50ml bottle" },
];

const STORAGE_KEY = "vault_inventory";

const formatZAR = (v) => v == null ? "—" : `R${Number(v).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
const EMPTY_FORM = { name: "", sku: "", category: "Perfume", unit: "unit", quantity: "", lowStock: "", costPrice: "", sellingPrice: "", notes: "" };

const catColor = (c) => ({
  "Perfume": "rgba(180,120,255,0.18)",
  "Home Care": "rgba(0,229,160,0.15)",
  "Raw Materials": "rgba(255,180,50,0.15)",
  "Packaging": "rgba(100,180,255,0.15)",
}[c] || "rgba(255,255,255,0.08)");

const stockColor = (item) => {
  if (item.quantity === 0) return "#ff4d4d";
  if (item.quantity <= item.lowStock) return "#ffaa00";
  return "#00e5a0";
};

export default function App() {
  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch { return INITIAL_INVENTORY; }
  });
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [toast, setToast] = useState(null);
  const [view, setView] = useState("list"); // list | stats

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory)); } catch {}
  }, [inventory]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const displayed = inventory.filter(item => {
    const catMatch = filter === "All" || item.category === filter;
    const q = search.toLowerCase();
    const srchMatch = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
    return catMatch && srchMatch;
  });

  const lowItems = inventory.filter(i => i.quantity <= i.lowStock);
  const totalValue = inventory.reduce((s, i) => s + i.quantity * i.costPrice, 0);
  const totalSellValue = inventory.filter(i => i.sellingPrice).reduce((s, i) => s + i.quantity * i.sellingPrice, 0);

  const nextId = () => Math.max(0, ...inventory.map(i => i.id)) + 1;

  const openAdd = () => { setForm(EMPTY_FORM); setModal({ mode: "add" }); };
  const openEdit = (item) => { setForm({ ...item, costPrice: item.costPrice ?? "", sellingPrice: item.sellingPrice ?? "" }); setModal({ mode: "edit", item }); };
  const openAdjust = (item) => { setAdjustQty(""); setAdjustNote(""); setModal({ mode: "adjust", item }); };
  const closeModal = () => setModal(null);

  const saveItem = () => {
    if (!form.name.trim() || !form.sku.trim() || form.quantity === "" || form.costPrice === "") {
      showToast("Fill in all required fields.", "error"); return;
    }
    const item = {
      ...form,
      id: modal.mode === "add" ? nextId() : modal.item.id,
      quantity: Number(form.quantity),
      lowStock: Number(form.lowStock) || 0,
      costPrice: Number(form.costPrice),
      sellingPrice: form.sellingPrice !== "" ? Number(form.sellingPrice) : null,
    };
    if (modal.mode === "add") {
      setInventory(prev => [...prev, item]);
      showToast(`"${item.name}" added.`);
    } else {
      setInventory(prev => prev.map(i => i.id === modal.item.id ? item : i));
      showToast(`"${item.name}" updated.`);
    }
    closeModal();
  };

  const applyAdjust = (type) => {
    const delta = Number(adjustQty);
    if (!delta || isNaN(delta)) { showToast("Enter a valid quantity.", "error"); return; }
    setInventory(prev => prev.map(i => {
      if (i.id !== modal.item.id) return i;
      const newQty = type === "add" ? i.quantity + delta : Math.max(0, i.quantity - delta);
      return { ...i, quantity: newQty };
    }));
    showToast(`Stock ${type === "add" ? "added" : "removed"}: ${delta} ${modal.item.unit}(s).`);
    closeModal();
  };

  const deleteItem = (id) => {
    const item = inventory.find(i => i.id === id);
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setInventory(prev => prev.filter(i => i.id !== id));
    showToast(`"${item.name}" removed.`, "warn");
  };

  return (
    <div style={s.root}>
      <div style={s.grain} />

      {/* HEADER */}
      <header style={s.header}>
        <div>
          <div style={s.brandMark}>✦</div>
          <h1 style={s.title}>VAULT</h1>
          <p style={s.subtitle}>Fragrance & Home · Inventory</p>
        </div>
        <button style={s.addBtn} onClick={openAdd}>+ Add</button>
      </header>

      {/* NAV TABS */}
      <div style={s.navTabs}>
        {["list", "stats"].map(v => (
          <button key={v} style={{ ...s.navTab, ...(view === v ? s.navTabActive : {}) }} onClick={() => setView(v)}>
            {v === "list" ? "📦 Inventory" : "📊 Overview"}
          </button>
        ))}
      </div>

      {view === "stats" ? (
        <StatsView inventory={inventory} lowItems={lowItems} totalValue={totalValue} totalSellValue={totalSellValue} />
      ) : (
        <>
          {/* ALERT BANNER */}
          {lowItems.length > 0 && (
            <div style={s.alertBanner}>
              ⚠ {lowItems.length} item{lowItems.length > 1 ? "s" : ""} low on stock: {lowItems.map(i => i.name).join(", ")}
            </div>
          )}

          {/* SEARCH */}
          <div style={s.searchWrap}>
            <input style={s.search} placeholder="🔍  Search name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* CATEGORY FILTER */}
          <div style={s.catScroll}>
            {CATEGORIES.map(c => (
              <button key={c} style={{ ...s.tab, ...(filter === c ? s.tabActive : {}) }} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>

          {/* CARDS */}
          <div style={s.cards}>
            {displayed.length === 0 && <div style={s.empty}>No items found.</div>}
            {displayed.map(item => (
              <div key={item.id} style={s.card}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.cardName}>{item.name}</div>
                    <div style={s.cardSku}>{item.sku}</div>
                  </div>
                  <span style={{ ...s.badge, background: catColor(item.category) }}>{item.category}</span>
                </div>
                {item.notes && <div style={s.cardNote}>{item.notes}</div>}
                <div style={s.cardMid}>
                  <div style={s.cardStat}>
                    <span style={{ color: stockColor(item), fontSize: 22, fontWeight: 700 }}>{item.quantity}</span>
                    <span style={s.cardStatLabel}>{item.unit}(s)</span>
                  </div>
                  <div style={s.cardStat}>
                    <span style={s.cardStatVal}>{formatZAR(item.costPrice)}</span>
                    <span style={s.cardStatLabel}>cost</span>
                  </div>
                  <div style={s.cardStat}>
                    <span style={s.cardStatVal}>{formatZAR(item.sellingPrice)}</span>
                    <span style={s.cardStatLabel}>sell</span>
                  </div>
                  <div style={s.cardStat}>
                    <span style={s.cardStatVal}>{formatZAR(item.quantity * item.costPrice)}</span>
                    <span style={s.cardStatLabel}>value</span>
                  </div>
                </div>
                <div style={s.cardActions}>
                  <button style={s.actionBtn} onClick={() => openAdjust(item)}>⇅ Adjust</button>
                  <button style={s.actionBtn} onClick={() => openEdit(item)}>✎ Edit</button>
                  <button style={{ ...s.actionBtn, color: "#ff6b6b", borderColor: "rgba(255,100,100,0.2)" }} onClick={() => deleteItem(item.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL */}
      {modal && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {modal.mode === "adjust" ? (
              <>
                <h2 style={s.modalTitle}>Adjust Stock</h2>
                <p style={{ color: "#aaa", marginBottom: 16, fontSize: 13 }}>
                  {modal.item.name} · <strong style={{ color: "#fff" }}>{modal.item.quantity} {modal.item.unit}(s)</strong> in stock
                </p>
                <label style={s.label}>Quantity *</label>
                <input style={s.input} type="number" min="0" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="e.g. 12" />
                <label style={s.label}>Note (optional)</label>
                <input style={s.input} value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. sold at market, received batch…" />
                <div style={s.modalBtns}>
                  <button style={{ ...s.saveBtn, background: "#00e5a0", color: "#0a0a0a" }} onClick={() => applyAdjust("add")}>+ Add Stock</button>
                  <button style={{ ...s.saveBtn, background: "#ff4d4d" }} onClick={() => applyAdjust("remove")}>− Remove Stock</button>
                </div>
                <button style={s.cancelBtn} onClick={closeModal}>Cancel</button>
              </>
            ) : (
              <>
                <h2 style={s.modalTitle}>{modal.mode === "add" ? "New Item" : "Edit Item"}</h2>
                {[
                  { label: "Item Name *", key: "name", placeholder: "e.g. Amber Dusk EDP" },
                  { label: "SKU *", key: "sku", placeholder: "e.g. AD-EDP-50" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={s.label}>{f.label}</label>
                    <input style={s.input} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                  </div>
                ))}
                <label style={s.label}>Category</label>
                <select style={s.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                </select>
                <label style={s.label}>Unit</label>
                <input style={s.input} value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} placeholder="bottle, g, ml, pack…" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={s.label}>Quantity *</label>
                    <input style={s.input} type="number" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <label style={s.label}>Low Stock Alert</label>
                    <input style={s.input} type="number" value={form.lowStock} onChange={e => setForm(p => ({ ...p, lowStock: e.target.value }))} placeholder="10" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={s.label}>Cost Price (R) *</label>
                    <input style={s.input} type="number" value={form.costPrice} onChange={e => setForm(p => ({ ...p, costPrice: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={s.label}>Selling Price (R)</label>
                    <input style={s.input} type="number" value={form.sellingPrice} onChange={e => setForm(p => ({ ...p, sellingPrice: e.target.value }))} placeholder="Optional" />
                  </div>
                </div>
                <label style={s.label}>Notes</label>
                <input style={s.input} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Size, origin, description…" />
                <button style={s.saveBtn} onClick={saveItem}>Save Item</button>
                <button style={s.cancelBtn} onClick={closeModal}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.type === "error" ? "#ff4d4d" : toast.type === "warn" ? "#ffaa00" : "#00e5a0",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function StatsView({ inventory, lowItems, totalValue, totalSellValue }) {
  const byCategory = CATEGORIES.filter(c => c !== "All").map(cat => ({
    cat,
    count: inventory.filter(i => i.category === cat).length,
    value: inventory.filter(i => i.category === cat).reduce((s, i) => s + i.quantity * i.costPrice, 0),
  }));

  return (
    <div style={{ padding: "20px 16px 60px" }}>
      <div style={s.statsGrid}>
        {[
          { label: "Total SKUs", value: inventory.length },
          { label: "Stock Cost Value", value: formatZAR(totalValue) },
          { label: "Potential Revenue", value: formatZAR(totalSellValue) },
          { label: "Low Stock Alerts", value: lowItems.length, warn: lowItems.length > 0 },
        ].map(stat => (
          <div key={stat.label} style={{ ...s.statCard, ...(stat.warn ? { borderColor: "#ffaa00" } : {}) }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', Georgia, serif", color: stat.warn ? "#ffaa00" : "#f0ede6" }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>By Category</div>
        {byCategory.map(({ cat, count, value }) => (
          <div key={cat} style={s.catRow}>
            <span style={{ ...s.badge, background: catColor(cat), marginRight: 12 }}>{cat}</span>
            <span style={{ color: "#aaa", fontSize: 12, flex: 1 }}>{count} SKU{count !== 1 ? "s" : ""}</span>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{formatZAR(value)}</span>
          </div>
        ))}
      </div>

      {lowItems.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 10, color: "#ffaa00", letterSpacing: 3, textTransform: "uppercase", marginBottom: 14 }}>⚠ Low Stock Items</div>
          {lowItems.map(item => (
            <div key={item.id} style={{ ...s.catRow, borderColor: "rgba(255,170,0,0.15)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#f0ede6" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#666" }}>{item.sku}</div>
              </div>
              <span style={{ color: stockColor(item), fontWeight: 700 }}>{item.quantity} left</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh", background: "#0a0a0a", color: "#f0ede6",
    fontFamily: "'DM Mono', 'Courier New', monospace",
    maxWidth: 600, margin: "0 auto", position: "relative",
  },
  grain: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.4,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
  },
  header: {
    position: "relative", zIndex: 1,
    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
    padding: "40px 20px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  brandMark: { fontSize: 11, color: "#c9a96e", letterSpacing: 6, marginBottom: 4 },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 36, fontWeight: 700, letterSpacing: 10, color: "#f0ede6", margin: "0 0 2px", lineHeight: 1,
  },
  subtitle: { color: "#555", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" },
  addBtn: {
    background: "#c9a96e", color: "#0a0a0a", border: "none",
    padding: "10px 20px", fontFamily: "'DM Mono', monospace",
    fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase",
  },
  navTabs: {
    display: "flex", position: "relative", zIndex: 1,
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  navTab: {
    flex: 1, background: "transparent", border: "none", color: "#555",
    padding: "14px", fontSize: 12, cursor: "pointer", letterSpacing: 1,
    fontFamily: "'DM Mono', monospace",
  },
  navTabActive: {
    color: "#c9a96e", borderBottom: "2px solid #c9a96e",
  },
  alertBanner: {
    background: "rgba(255,170,0,0.1)", borderBottom: "1px solid rgba(255,170,0,0.2)",
    color: "#ffaa00", fontSize: 11, padding: "10px 20px", letterSpacing: 0.5,
    position: "relative", zIndex: 1,
  },
  searchWrap: { padding: "16px 16px 0", position: "relative", zIndex: 1 },
  search: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", color: "#f0ede6",
    padding: "12px 16px", fontFamily: "'DM Mono', monospace",
    fontSize: 13, outline: "none", boxSizing: "border-box",
  },
  catScroll: {
    display: "flex", gap: 8, overflowX: "auto",
    padding: "14px 16px", position: "relative", zIndex: 1,
    scrollbarWidth: "none",
  },
  tab: {
    background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
    color: "#555", padding: "6px 14px", fontSize: 11, letterSpacing: 1.5,
    textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
    fontFamily: "'DM Mono', monospace", flexShrink: 0,
  },
  tabActive: { border: "1px solid #c9a96e", color: "#c9a96e", background: "rgba(201,169,110,0.08)" },
  cards: { padding: "8px 16px 80px", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    padding: "16px",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: 600, color: "#f0ede6", marginBottom: 2 },
  cardSku: { fontSize: 11, color: "#555", letterSpacing: 1 },
  cardNote: { fontSize: 11, color: "#555", marginBottom: 12, lineHeight: 1.5 },
  badge: {
    display: "inline-block", padding: "3px 10px",
    fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#ccc", flexShrink: 0,
  },
  cardMid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8, margin: "12px 0",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    padding: "10px 0",
  },
  cardStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  cardStatVal: { fontSize: 13, fontWeight: 600, color: "#d0cdc6" },
  cardStatLabel: { fontSize: 9, color: "#444", letterSpacing: 1.5, textTransform: "uppercase" },
  cardActions: { display: "flex", gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
    color: "#888", padding: "8px", fontSize: 11, cursor: "pointer",
    fontFamily: "'DM Mono', monospace", letterSpacing: 1,
  },
  empty: { textAlign: "center", color: "#444", padding: "60px 20px", fontSize: 13, letterSpacing: 1 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
    zIndex: 100, display: "flex", alignItems: "flex-end",
  },
  modal: {
    background: "#111", borderTop: "1px solid rgba(255,255,255,0.1)",
    padding: "28px 20px 40px", width: "100%", maxHeight: "90vh",
    overflowY: "auto",
  },
  modalTitle: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 22, color: "#f0ede6", marginBottom: 20, letterSpacing: 2,
  },
  label: { display: "block", fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, marginTop: 16 },
  input: {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", color: "#f0ede6",
    padding: "12px 14px", fontFamily: "'DM Mono', monospace", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  },
  modalBtns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24 },
  saveBtn: {
    display: "block", width: "100%", background: "#c9a96e", color: "#0a0a0a", border: "none",
    padding: "14px", fontFamily: "'DM Mono', monospace",
    fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: 2,
    textTransform: "uppercase", marginTop: 20,
  },
  cancelBtn: {
    display: "block", width: "100%", background: "transparent", color: "#555",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "12px", fontFamily: "'DM Mono', monospace",
    fontSize: 12, cursor: "pointer", marginTop: 10,
  },
  toast: {
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    zIndex: 200, padding: "12px 24px", fontSize: 12, fontWeight: 700,
    letterSpacing: 1.5, fontFamily: "'DM Mono', monospace",
    color: "#0a0a0a", whiteSpace: "nowrap",
  },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  statCard: {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
    padding: "20px 16px",
  },
  catRow: {
    display: "flex", alignItems: "center",
    padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
};
