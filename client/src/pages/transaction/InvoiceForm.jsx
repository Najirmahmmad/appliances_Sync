import { useState, useEffect } from "react";

// ─── Icons (inline SVG to avoid any icon lib issues in APK) ─────────────────
const Icon = ({ d, size = 18, color = "currentColor", style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);
const CalendarIcon = () => <Icon d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />;
const PhoneIcon = () => <Icon d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.14 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />;
const UserIcon = () => <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
const MapPinIcon = () => <Icon d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />;
const MailIcon = () => <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" />;
const CreditCardIcon = () => <Icon d="M1 4h22v16H1z M1 10h22" />;
const FileTextIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />;
const PlusIcon = () => <Icon d="M12 5v14M5 12h14" />;
const MinusIcon = () => <Icon d="M5 12h14" />;
const SaveIcon = () => <Icon d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8" />;
const ShareIcon = () => <Icon d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13" />;
const AlertIcon = () => <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />;
const CheckIcon = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />;
const SpinIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
const ChevronDownIcon = () => <Icon d="M6 9l6 6 6-6" size={16} />;
const TrashIcon = () => <Icon d="M3 6h18 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6 M10 11v6 M14 11v6 M9 6V4h6v2" size={16} />;

// ─── Today's date helper ─────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

// ─── Simple item row factory ──────────────────────────────────────────────────
const newItem = (sr) => ({ sr_no: sr, item_code: "", item_name: "", qty: 1, rate: 0, tax_perc: 0, basic_amt: 0, tax_amt: 0, net_amt: 0 });

// ─── Calc helpers ─────────────────────────────────────────────────────────────
const calcItem = (item) => {
  const qty = parseFloat(item.qty) || 0;
  const rate = parseFloat(item.rate) || 0;
  const tax = parseFloat(item.tax_perc) || 0;
  const net_amt = qty * rate;
  const basic_amt = tax > 0 ? net_amt / (1 + tax / 100) : net_amt;
  const tax_amt = net_amt - basic_amt;
  return { ...item, basic_amt, tax_amt, net_amt };
};

// ─── Fake items for demo ───────────────────────────────────────────────────────
const DEMO_ITEMS = [
  { value: "ITM001", label: "Product A - Widget" },
  { value: "ITM002", label: "Product B - Gadget" },
  { value: "ITM003", label: "Product C - Doohickey" },
  { value: "ITM004", label: "Service - Consulting" },
];

// ─── SimpleSelect (no library needed, works everywhere) ───────────────────────
function SimpleSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px", background: "var(--bg-input)", border: "1.5px solid var(--border)",
          borderRadius: 10, fontSize: 15, color: selected ? "var(--text-primary)" : "var(--text-muted)",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <ChevronDownIcon />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
          background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto",
        }}>
          <div
            onClick={() => { onChange(""); setOpen(false); }}
            style={{ padding: "10px 14px", fontSize: 14, color: "var(--text-muted)", cursor: "pointer" }}
          >— {placeholder} —</div>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value, o.label); setOpen(false); }}
              style={{
                padding: "10px 14px", fontSize: 14, cursor: "pointer",
                background: o.value === value ? "var(--accent-light)" : "transparent",
                color: o.value === value ? "var(--accent)" : "var(--text-primary)",
                fontWeight: o.value === value ? 500 : 400,
              }}
            >{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────
function Field({ label, required, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Input({ icon: IconComp, type = "text", ...props }) {
  return (
    <div style={{ position: "relative" }}>
      {IconComp && (
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex" }}>
          <IconComp />
        </span>
      )}
      <input
        type={type}
        style={{
          width: "100%", boxSizing: "border-box",
          paddingLeft: IconComp ? 42 : 14, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
          fontSize: 15, border: "1.5px solid var(--border)", borderRadius: 10,
          background: "var(--bg-input)", color: "var(--text-primary)", outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
        {...props}
      />
    </div>
  );
}

function Textarea({ icon: IconComp, rows = 2, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      {IconComp && (
        <span style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)", pointerEvents: "none", display: "flex" }}>
          <IconComp />
        </span>
      )}
      <textarea
        rows={rows}
        style={{
          width: "100%", boxSizing: "border-box",
          paddingLeft: IconComp ? 42 : 14, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
          fontSize: 15, border: "1.5px solid var(--border)", borderRadius: 10,
          background: "var(--bg-input)", color: "var(--text-primary)", outline: "none",
          resize: "vertical", fontFamily: "inherit", transition: "border-color 0.15s",
        }}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
        {...props}
      />
    </div>
  );
}

function SelectInput({ icon: IconComp, children, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      {IconComp && (
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "flex", zIndex: 1 }}>
          <IconComp />
        </span>
      )}
      <select
        style={{
          width: "100%", boxSizing: "border-box",
          paddingLeft: IconComp ? 42 : 14, paddingRight: 14, paddingTop: 11, paddingBottom: 11,
          fontSize: 15, border: "1.5px solid var(--border)", borderRadius: 10,
          background: "var(--bg-input)", color: "var(--text-primary)", outline: "none",
          appearance: "none", cursor: "pointer",
        }}
        {...props}
      >{children}</select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}><ChevronDownIcon /></span>
    </div>
  );
}

// ─── Number input (right-aligned, compact) ────────────────────────────────────
function NumInput({ value, onChange, min = 0, step = "0.01" }) {
  return (
    <input
      type="number" min={min} step={step} value={value} onChange={onChange}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "8px 10px", fontSize: 14, textAlign: "right",
        border: "1.5px solid var(--border)", borderRadius: 8,
        background: "var(--bg-input)", color: "var(--text-primary)", outline: "none",
      }}
      onFocus={e => e.target.style.borderColor = "var(--accent)"}
      onBlur={e => e.target.style.borderColor = "var(--border)"}
    />
  );
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
function Btn({ variant = "primary", onClick, disabled, type = "button", children, fullWidth, small }) {
  const styles = {
    primary: { background: "var(--accent)", color: "#fff", border: "none" },
    secondary: { background: "var(--bg-card)", color: "var(--text-primary)", border: "1.5px solid var(--border)" },
    success: { background: "#16a34a", color: "#fff", border: "none" },
    danger: { background: "#dc2626", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "var(--text-secondary)", border: "1.5px solid var(--border)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: small ? "7px 14px" : "11px 20px",
        fontSize: small ? 13 : 14, fontWeight: 600, borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? "100%" : "auto",
        transition: "opacity 0.15s, transform 0.1s",
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
      onTouchStart={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onTouchEnd={e => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────
function Tab({ label, active, onClick, badge }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        flex: 1, padding: "11px 8px", fontSize: 14, fontWeight: 600, border: "none",
        borderRadius: 9, cursor: "pointer", transition: "all 0.15s",
        background: active ? "var(--bg-card)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-muted)",
        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}
    >
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          background: "var(--accent)", color: "#fff", borderRadius: 99,
          fontSize: 11, fontWeight: 700, padding: "1px 7px", minWidth: 18, textAlign: "center",
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─── Summary pill ─────────────────────────────────────────────────────────────
function SumPill({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function InvoiceForm({ bookCode = "SA", onSubmit, onWhatsApp }) {
  const [tab, setTab] = useState(1);
  const [header, setHeader] = useState({
    vouch_date: today(), party_phone: "", party_name: "",
    party_address: "", party_email: "", party_gst: "",
    payment_mode: "Cash", remarks: "",
  });
  const [items, setItems] = useState([newItem(1)]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isSales = bookCode === "SA";

  // ─── Header change ──────────────────────────────────────────────────────────
  const hc = (e) => setHeader(h => ({ ...h, [e.target.name]: e.target.value }));
  const phoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 10);
    setHeader(h => ({ ...h, party_phone: v }));
    if (v.length === 10) { setAutoFillLoading(true); setTimeout(() => setAutoFillLoading(false), 1200); }
  };

  // ─── Item helpers ────────────────────────────────────────────────────────────
  const updateItem = (index, field, value, extra = {}) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = calcItem({ ...next[index], [field]: value, ...extra });
      return next;
    });
  };
  const addRow = () => setItems(p => [...p, newItem(p.length + 1)]);
  const removeRow = (i) => {
    if (items.length <= 1) return;
    setItems(p => p.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, sr_no: idx + 1 })));
  };

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const validItems = items.filter(i => i.item_code && i.qty > 0);
  const summary = validItems.reduce((acc, i) => ({
    totalItems: acc.totalItems + 1,
    totalQty: acc.totalQty + parseFloat(i.qty || 0),
    totalTax: acc.totalTax + i.tax_amt,
    grandTotal: acc.grandTotal + i.net_amt,
    totalSGST: acc.totalSGST + i.tax_amt / 2,
    totalCGST: acc.totalCGST + i.tax_amt / 2,
  }), { totalItems: 0, totalQty: 0, totalTax: 0, grandTotal: 0, totalSGST: 0, totalCGST: 0 });

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.vouch_date || !header.party_name) { setError("Date and Party Name are required."); return; }
    if (validItems.length === 0) { setError("Add at least one valid item."); return; }
    setError(""); setFormLoading(true);
    try {
      if (onSubmit) await onSubmit({ header, items: validItems, summary });
      setSuccess("Invoice saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch { setError("Failed to save. Please try again."); }
    finally { setFormLoading(false); }
  };

  const handleWhatsApp = async () => {
    if (!header.party_phone) { setError("Phone number required for WhatsApp."); return; }
    setShareLoading(true);
    try { if (onWhatsApp) await onWhatsApp({ header, items: validItems, summary }); }
    finally { setShareLoading(false); }
  };

  // ─── CSS vars ─────────────────────────────────────────────────────────────────
  const cssVars = `
    :root {
      --accent: #2563eb;
      --accent-light: #eff6ff;
      --bg-page: #f3f4f6;
      --bg-card: #ffffff;
      --bg-input: #f9fafb;
      --border: #e5e7eb;
      --text-primary: #111827;
      --text-secondary: #374151;
      --text-muted: #9ca3af;
      --danger: #dc2626;
      --success: #16a34a;
      --shadow: 0 1px 4px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --accent: #3b82f6;
        --accent-light: #1e3a5f;
        --bg-page: #0f172a;
        --bg-card: #1e293b;
        --bg-input: #0f172a;
        --border: #334155;
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-muted: #64748b;
        --shadow: 0 1px 4px rgba(0,0,0,0.3);
      }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    * { box-sizing: border-box; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; }
  `;

  return (
    <>
      <style>{cssVars}</style>

      {/* Page wrapper */}
      <div style={{ minHeight: "100vh", background: "var(--bg-page)", paddingBottom: 100 }}>

        {/* ── Header bar ─────────────────────────────────────────────────────── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "var(--bg-card)", borderBottom: "1px solid var(--border)",
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              {isSales ? "Sales Invoice" : "Sales Return"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
              {header.vouch_date || "Select date"}
            </div>
          </div>
          {summary.grandTotal > 0 && (
            <div style={{
              background: "var(--accent-light)", borderRadius: 10,
              padding: "6px 14px", textAlign: "right",
            }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, textTransform: "uppercase" }}>Total</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>₹{summary.grandTotal.toFixed(2)}</div>
            </div>
          )}
        </div>

        <div style={{ maxWidth: 780, margin: "0 auto", padding: "16px 12px" }}>

          {/* ── Alerts ──────────────────────────────────────────────────────── */}
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, marginBottom: 12, color: "#991b1b" }}>
              <AlertIcon /><span style={{ fontSize: 14, lineHeight: 1.5 }}>{error}</span>
            </div>
          )}
          {success && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, marginBottom: 12, color: "#166534" }}>
              <CheckIcon /><span style={{ fontSize: 14 }}>{success}</span>
            </div>
          )}

          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          <div style={{ background: "var(--border)", borderRadius: 12, padding: 4, display: "flex", gap: 4, marginBottom: 16 }}>
            <Tab label="Customer Details" active={tab === 1} onClick={() => setTab(1)} />
            <Tab label="Items" active={tab === 2} onClick={() => setTab(2)} badge={validItems.length} />
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1 – CUSTOMER
          ══════════════════════════════════════════════════════════════════ */}
          {tab === 1 && (
            <form onSubmit={handleSubmit}>
              <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)" }}>

                {/* Section header */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--accent-light)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Invoice Details
                  </div>
                </div>

                <div style={{ padding: 18, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>

                  <Field label="Voucher Date" required>
                    <Input icon={CalendarIcon} type="date" name="vouch_date" value={header.vouch_date} onChange={hc} required />
                  </Field>

                  <Field label="Payment Mode">
                    <SelectInput icon={CreditCardIcon} name="payment_mode" value={header.payment_mode} onChange={hc}>
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                    </SelectInput>
                  </Field>

                </div>

                {/* Section header */}
                <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--accent-light)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Customer Information
                  </div>
                </div>

                <div style={{ padding: 18, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>

                  <Field label="Phone (10 digits)">
                    <Input icon={PhoneIcon} type="tel" name="party_phone" value={header.party_phone} onChange={phoneChange} placeholder="Enter 10-digit phone" />
                    {autoFillLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12, color: "var(--accent)" }}>
                        <SpinIcon /> Auto-filling details...
                      </div>
                    )}
                  </Field>

                  <Field label="Customer Name" required>
                    <Input icon={UserIcon} type="text" name="party_name" value={header.party_name} onChange={hc} required placeholder="Enter customer name" />
                  </Field>

                  <Field label="Email">
                    <Input icon={MailIcon} type="email" name="party_email" value={header.party_email} onChange={hc} placeholder="customer@email.com" />
                  </Field>

                  <Field label="GST Number">
                    <Input type="text" name="party_gst" value={header.party_gst} onChange={hc} placeholder="22AAAAA0000A1Z5" />
                  </Field>

                </div>

                {/* Expandable */}
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(v => !v)}
                    style={{
                      width: "100%", padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)",
                    }}
                  >
                    <span>More Details (Address & Remarks)</span>
                    <span style={{ transform: moreOpen ? "rotate(180deg)" : "none", transition: "0.2s", display: "flex" }}><ChevronDownIcon /></span>
                  </button>

                  {moreOpen && (
                    <div style={{ padding: "0 18px 18px", display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))" }}>
                      <Field label="Address">
                        <Textarea icon={MapPinIcon} name="party_address" value={header.party_address} onChange={hc} placeholder="Customer address" rows={3} />
                      </Field>
                      <Field label="Remarks">
                        <Textarea icon={FileTextIcon} name="remarks" value={header.remarks} onChange={hc} placeholder="Additional notes..." rows={3} />
                      </Field>
                    </div>
                  )}
                </div>

              </div>

              {/* Next button */}
              <div style={{ marginTop: 16 }}>
                <Btn fullWidth onClick={() => setTab(2)}>
                  Next: Add Items →
                </Btn>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2 – ITEMS
          ══════════════════════════════════════════════════════════════════ */}
          {tab === 2 && (
            <form onSubmit={handleSubmit}>

              {/* ── Desktop table ───────────────────────────────────────── */}
              <div style={{ display: "none" }} className="desktop-items">
                <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                      <thead>
                        <tr style={{ background: "var(--accent-light)" }}>
                          {["#", "Item", "Qty", "Rate (Inc. Tax)", "Tax %", "Amount", ""].map((h, i) => (
                            <th key={i} style={{ padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: i >= 2 ? "right" : "left", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)", width: 40 }}>{item.sr_no}</td>
                            <td style={{ padding: "6px 8px", minWidth: 220 }}>
                              <SimpleSelect
                                value={item.item_code}
                                placeholder="Select item..."
                                options={DEMO_ITEMS}
                                onChange={(val, label) => updateItem(index, "item_code", val, { item_name: label || "" })}
                              />
                            </td>
                            <td style={{ padding: "6px 6px", width: 90 }}>
                              <NumInput value={item.qty} min={0.01} onChange={e => updateItem(index, "qty", e.target.value)} />
                            </td>
                            <td style={{ padding: "6px 6px", width: 120 }}>
                              <NumInput value={item.rate} onChange={e => updateItem(index, "rate", e.target.value)} />
                            </td>
                            <td style={{ padding: "6px 6px", width: 90 }}>
                              <NumInput value={item.tax_perc} onChange={e => updateItem(index, "tax_perc", e.target.value)} />
                            </td>
                            <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 600, textAlign: "right", color: item.net_amt > 0 ? "var(--accent)" : "var(--text-muted)", width: 110, whiteSpace: "nowrap" }}>
                              ₹{item.net_amt.toFixed(2)}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "center", width: 40 }}>
                              <button type="button" onClick={() => removeRow(index)} disabled={items.length <= 1} style={{ background: "none", border: "none", cursor: items.length <= 1 ? "not-allowed" : "pointer", color: "#dc2626", opacity: items.length <= 1 ? 0.3 : 1, padding: 6, borderRadius: 6, display: "flex" }}>
                                <TrashIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
                    <Btn variant="ghost" small onClick={addRow}>
                      <PlusIcon /> Add Item
                    </Btn>
                  </div>
                </div>
              </div>

              {/* ── Mobile cards ─────────────────────────────────────────── */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {items.map((item, index) => (
                  <div key={index} style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow)" }}>

                    {/* Card header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--accent-light)", borderBottom: "1px solid var(--border)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Item #{item.sr_no}</span>
                      <button
                        type="button" onClick={() => removeRow(index)} disabled={items.length <= 1}
                        style={{ background: "none", border: "none", cursor: items.length <= 1 ? "not-allowed" : "pointer", color: "#dc2626", opacity: items.length <= 1 ? 0.3 : 1, display: "flex", padding: 4 }}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    <div style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
                      <Field label="Select Item">
                        <SimpleSelect
                          value={item.item_code}
                          placeholder="Search & select item..."
                          options={DEMO_ITEMS}
                          onChange={(val, label) => updateItem(index, "item_code", val, { item_name: label || "" })}
                        />
                      </Field>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <Field label="Qty">
                          <NumInput value={item.qty} min={0.01} onChange={e => updateItem(index, "qty", e.target.value)} />
                        </Field>
                        <Field label="Rate">
                          <NumInput value={item.rate} onChange={e => updateItem(index, "rate", e.target.value)} />
                        </Field>
                        <Field label="Tax %">
                          <NumInput value={item.tax_perc} onChange={e => updateItem(index, "tax_perc", e.target.value)} />
                        </Field>
                      </div>

                      {item.item_code && item.qty > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            Basic: ₹{item.basic_amt.toFixed(2)} + Tax: ₹{item.tax_amt.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--accent)" }}>₹{item.net_amt.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add item */}
                <button
                  type="button" onClick={addRow}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px", background: "transparent", border: "2px dashed var(--border)",
                    borderRadius: 14, fontSize: 14, fontWeight: 600, color: "var(--accent)", cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--accent-light)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <PlusIcon /> Add Another Item
                </button>
              </div>

              {/* ── Summary card ─────────────────────────────────────────── */}
              {summary.totalItems > 0 && (
                <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1px solid var(--border)", padding: "16px 20px", marginTop: 14, boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 16 }}>
                    <SumPill label="Items" value={summary.totalItems} />
                    <SumPill label="Qty" value={summary.totalQty.toFixed(0)} />
                    <SumPill label="SGST" value={`₹${summary.totalSGST.toFixed(2)}`} />
                    <SumPill label="CGST" value={`₹${summary.totalCGST.toFixed(2)}`} />
                    <SumPill label="Tax" value={`₹${summary.totalTax.toFixed(2)}`} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Total</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", marginTop: 2 }}>₹{summary.grandTotal.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action buttons (always visible, never clipped) ────────── */}
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <Btn variant="ghost" onClick={() => setTab(1)}>
                  ← Back
                </Btn>
                <Btn variant="success" onClick={handleWhatsApp} disabled={shareLoading || !header.party_phone}>
                  {shareLoading ? <SpinIcon /> : <ShareIcon />}
                  WhatsApp Share
                </Btn>
                <Btn type="submit" disabled={formLoading}>
                  {formLoading ? <SpinIcon /> : <SaveIcon />}
                  Save Invoice
                </Btn>
              </div>

            </form>
          )}

        </div>
      </div>
    </>
  );
}
