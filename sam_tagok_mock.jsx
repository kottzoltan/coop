import React, { useState, useMemo } from "react";
import {
  Search, Plus, ChevronDown, ArrowLeft, X, Check, AlertTriangle,
  FileText, Users, Filter, MoreVertical, Download, RefreshCw,
  UserPlus, Ban, LogOut, ChevronRight, Pencil, Save, Building2,
  GraduationCap, IdCard, Briefcase, FolderOpen
} from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// ink:      #1C2536  (sidebar / headers)
// paper:    #F6F4EF  (page background)
// card:     #FFFFFF
// gold:     #B8863F  (accent — cooperative / membership)
// line:     #E4E0D6
// ok:       #2F7A4E
// warn:     #B4791F
// bad:      #B4402C
// ---------------------------------------------------------------------------

const OFFICES = ["Budapest", "Debrecen", "Szeged", "Pécs", "Győr"];
const SCHOOLS = [
  "BME", "ELTE", "Corvinus", "SZTE", "PTE", "DE", "SZE", "Budapesti Gazdasági Egyetem",
];

const seedStudents = [
  { id: 1, nev: "Kovács Anna", adoszam: "8412345678", taj: "123 456 789", email: "kovacs.anna@melodiak.hu", telefon: "+36 30 111 2233", szuldat: "2002.04.12", lakcim: "1085 Budapest, Üllői út 12.", iroda: "Budapest", iskola: "BME", diakig: "DI-2024-00981", diakig_ervenyes: "2026.10.31", tagsag: "érvényes", belepes: "2023.09.01", kilepes: null, reszjegy: 3000, bank: "van", eszerz: "van", eszerz_lejar: "2026.09.30", uzemorv: "van", uzemorv_lejar: "2026.12.01", tudo: "van", tudo_lejar: "2027.01.15", dokumentumok: ["Diákigazolvány másolat", "Bankszámla igazolás"] },
  { id: 2, nev: "Nagy Bence", adoszam: "8423456789", taj: "234 567 890", email: "nagy.bence@melodiak.hu", telefon: "+36 20 222 3344", szuldat: "2001.11.03", lakcim: "4024 Debrecen, Kossuth u. 3.", iroda: "Debrecen", iskola: "DE", diakig: "DI-2023-00214", diakig_ervenyes: "2026.06.30", tagsag: "érvényes", belepes: "2022.02.15", kilepes: null, reszjegy: 3000, bank: "nincs", eszerz: "lejárt", eszerz_lejar: "2026.05.31", uzemorv: "nincs", uzemorv_lejar: null, tudo: "van", tudo_lejar: "2026.11.20", dokumentumok: ["Diákigazolvány másolat"] },
  { id: 3, nev: "Tóth Eszter", adoszam: "8434567890", taj: "345 678 901", email: "toth.eszter@melodiak.hu", telefon: "+36 70 333 4455", szuldat: "2003.02.27", lakcim: "6720 Szeged, Dugonics tér 2.", iroda: "Szeged", iskola: "SZTE", diakig: "DI-2025-01122", diakig_ervenyes: "2027.03.31", tagsag: "érvényes", belepes: "2024.01.10", kilepes: null, reszjegy: 3000, bank: "van", eszerz: "van", eszerz_lejar: "2026.08.15", uzemorv: "van", uzemorv_lejar: "2026.07.05", tudo: "nincs", tudo_lejar: null, dokumentumok: [] },
  { id: 4, nev: "Szabó Márk", adoszam: "8445678901", taj: "456 789 012", email: "szabo.mark@melodiak.hu", telefon: "+36 30 444 5566", szuldat: "2000.08.19", lakcim: "7622 Pécs, Rákóczi út 5.", iroda: "Pécs", iskola: "PTE", diakig: "DI-2022-00089", diakig_ervenyes: "2026.02.28", tagsag: "érvénytelen", belepes: "2021.09.01", kilepes: "2026.03.01", reszjegy: 3000, bank: "van", eszerz: "van", eszerz_lejar: "2025.12.31", uzemorv: "van", uzemorv_lejar: "2025.10.10", tudo: "van", tudo_lejar: "2025.09.09", dokumentumok: ["Kilépési nyilatkozat"] },
  { id: 5, nev: "Kiss Zoé", adoszam: "8456789012", taj: "567 890 123", email: "kiss.zoe@melodiak.hu", telefon: "+36 20 555 6677", szuldat: "2004.01.05", lakcim: "9022 Győr, Bécsi kapu tér 1.", iroda: "Győr", iskola: "SZE", diakig: "DI-2025-01887", diakig_ervenyes: "2027.09.30", tagsag: "érvényes", belepes: "2025.02.01", kilepes: null, reszjegy: 3000, bank: "van", eszerz: "van", eszerz_lejar: "2026.10.01", uzemorv: "van", uzemorv_lejar: "2026.09.01", tudo: "van", tudo_lejar: "2026.09.01", dokumentumok: ["Diákigazolvány másolat", "Bankszámla igazolás", "Eseti szerződés"] },
  { id: 6, nev: "Horváth Dávid", adoszam: "8467890123", taj: "678 901 234", email: "horvath.david@melodiak.hu", telefon: "+36 30 666 7788", szuldat: "2002.06.30", lakcim: "1112 Budapest, Kelenföldi u. 8.", iroda: "Budapest", iskola: "Corvinus", diakig: "DI-2024-00567", diakig_ervenyes: "2026.08.31", tagsag: "érvényes", belepes: "2023.11.20", kilepes: null, reszjegy: 3000, bank: "nincs", eszerz: "nincs", eszerz_lejar: null, uzemorv: "nincs", uzemorv_lejar: null, tudo: "nincs", tudo_lejar: null, dokumentumok: [] },
  { id: 7, nev: "Varga Léna", adoszam: "8478901234", taj: "789 012 345", email: "varga.lena@melodiak.hu", telefon: "+36 70 777 8899", szuldat: "2001.12.14", lakcim: "1073 Budapest, Erzsébet krt. 20.", iroda: "Budapest", iskola: "ELTE", diakig: "DI-2023-00341", diakig_ervenyes: "2026.06.30", tagsag: "piszkozat", belepes: null, kilepes: null, reszjegy: 0, bank: "nincs", eszerz: "nincs", eszerz_lejar: null, uzemorv: "nincs", uzemorv_lejar: null, tudo: "nincs", tudo_lejar: null, dokumentumok: [] },
  { id: 8, nev: "Molnár Petra", adoszam: "8489012345", taj: "890 123 456", email: "molnar.petra@melodiak.hu", telefon: "+36 20 888 9900", szuldat: "2003.09.09", lakcim: "6722 Szeged, Tisza L. krt. 44.", iroda: "Szeged", iskola: "SZTE", diakig: "DI-2025-01455", diakig_ervenyes: "2027.05.31", tagsag: "érvényes", belepes: "2024.09.01", kilepes: null, reszjegy: 3000, bank: "van", eszerz: "van", eszerz_lejar: "2026.09.20", uzemorv: "lejárt", uzemorv_lejar: "2026.05.01", tudo: "van", tudo_lejar: "2026.12.31", dokumentumok: ["Diákigazolvány másolat"] },
];

const statusStyle = {
  "érvényes":    { bg: "#EAF3EC", fg: "#2F7A4E", dot: "#2F7A4E" },
  "érvénytelen": { bg: "#F7EAE7", fg: "#B4402C", dot: "#B4402C" },
  "piszkozat":   { bg: "#F1EFE9", fg: "#7A7460", dot: "#B8863F" },
};

function StatusBadge({ status }) {
  const s = statusStyle[status] || statusStyle["piszkozat"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.fg, letterSpacing: ".01em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.dot }} />
      {status}
    </span>
  );
}

function fieldFlag(val) {
  if (val === "van") return { label: "OK", bg: "#EAF3EC", fg: "#2F7A4E" };
  if (val === "lejárt") return { label: "lejárt", bg: "#FBF0DF", fg: "#B4791F" };
  return { label: "hiányzik", bg: "#F7EAE7", fg: "#B4402C" };
}

function WarningBadges({ s }) {
  const items = [];
  if (s.bank === "nincs") items.push("nincs bankszámla");
  if (s.eszerz === "nincs") items.push("nincs eseti szerz.");
  if (s.eszerz === "lejárt") items.push("lejárt eseti szerz.");
  if (s.uzemorv === "nincs") items.push("nincs orvosi");
  if (s.uzemorv === "lejárt") items.push("lejárt orvosi");
  if (s.tudo === "nincs") items.push("nincs tüdőszűrő");
  if (items.length === 0) return <span style={{ color: "#9A9584", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {items.map((t) => (
        <span key={t} style={{
          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
          background: "#F7EAE7", color: "#B4402C", whiteSpace: "nowrap",
        }}>{t}</span>
      ))}
    </div>
  );
}

function Field({ label, value, editing, onChange, type = "text" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#8A8570", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
      {editing ? (
        <input
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{
            font: "inherit", fontSize: 14, padding: "7px 9px", borderRadius: 7,
            border: "1px solid #D8D3C4", outline: "none", background: "#fff",
          }}
        />
      ) : (
        <span style={{ fontSize: 14.5, color: "#232619", fontWeight: 500 }}>{value || "—"}</span>
      )}
    </div>
  );
}

function StatusPill({ label, value }) {
  const f = fieldFlag(value);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#8A8570", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</span>
      <span style={{
        alignSelf: "flex-start", fontSize: 12.5, fontWeight: 700, padding: "3px 10px",
        borderRadius: 999, background: f.bg, color: f.fg,
      }}>{value === "van" ? "megvan" : value}</span>
    </div>
  );
}

const TABS = [
  { id: "alap", label: "Alapadatok", icon: IdCard },
  { id: "tagsag", label: "Tagsági adatok", icon: Users },
  { id: "tanulmany", label: "Tanulmányi adatok", icon: GraduationCap },
  { id: "munka", label: "Munkavégzési adatok", icon: Briefcase },
  { id: "dokumentum", label: "Dokumentumok", icon: FolderOpen },
];

function ProfileView({ student, onBack, onSave }) {
  const [tab, setTab] = useState("alap");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(student);

  React.useEffect(() => { setDraft(student); setEditing(false); }, [student]);

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <button onClick={onBack} style={btnGhost}>
        <ArrowLeft size={15} /> Vissza a listához
      </button>

      <div style={{ ...card, marginTop: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, background: "#1C2536",
              color: "#E9C989", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 17,
            }}>
              {student.nev.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#1C2536" }}>{student.nev}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <StatusBadge status={student.tagsag} />
                <span style={{ fontSize: 12.5, color: "#8A8570" }}>{student.iroda} · {student.iskola}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {editing ? (
              <>
                <button style={btnGhost} onClick={() => { setDraft(student); setEditing(false); }}>Mégse</button>
                <button style={btnPrimary} onClick={() => { onSave(draft); setEditing(false); }}>
                  <Save size={14} /> Mentés
                </button>
              </>
            ) : (
              <button style={btnGhost} onClick={() => setEditing(true)}>
                <Pencil size={14} /> Szerkesztés
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: "1px solid #E4E0D6", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "9px 14px",
                  background: "none", border: "none", cursor: "pointer", fontSize: 13.5,
                  fontWeight: 600, color: active ? "#1C2536" : "#9A9584",
                  borderBottom: active ? "2px solid #B8863F" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ paddingTop: 20 }}>
          {tab === "alap" && (
            <div style={grid3}>
              <Field label="Név" value={draft.nev} editing={editing} onChange={set("nev")} />
              <Field label="Adószám" value={draft.adoszam} editing={editing} onChange={set("adoszam")} />
              <Field label="TAJ szám" value={draft.taj} editing={editing} onChange={set("taj")} />
              <Field label="Születési dátum" value={draft.szuldat} editing={editing} onChange={set("szuldat")} />
              <Field label="E-mail" value={draft.email} editing={editing} onChange={set("email")} />
              <Field label="Telefonszám" value={draft.telefon} editing={editing} onChange={set("telefon")} />
              <Field label="Lakcím" value={draft.lakcim} editing={editing} onChange={set("lakcim")} />
            </div>
          )}

          {tab === "tagsag" && (
            <div style={grid3}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={labelStyle}>Tagság státusz</span>
                <StatusBadge status={draft.tagsag} />
              </div>
              <Field label="Iroda" value={draft.iroda} editing={editing} onChange={set("iroda")} />
              <Field label="Belépés dátuma" value={draft.belepes} editing={editing} onChange={set("belepes")} />
              <Field label="Kilépés dátuma" value={draft.kilepes} editing={editing} onChange={set("kilepes")} />
              <Field label="Részjegy összeg" value={draft.reszjegy ? `${draft.reszjegy.toLocaleString("hu-HU")} Ft` : "—"} editing={false} />
            </div>
          )}

          {tab === "tanulmany" && (
            <div style={grid3}>
              <Field label="Iskola" value={draft.iskola} editing={editing} onChange={set("iskola")} />
              <Field label="Diákigazolvány szám" value={draft.diakig} editing={editing} onChange={set("diakig")} />
              <Field label="Érvényesség" value={draft.diakig_ervenyes} editing={editing} onChange={set("diakig_ervenyes")} />
            </div>
          )}

          {tab === "munka" && (
            <div style={grid3}>
              <StatusPill label="Bankszámla" value={draft.bank} />
              <StatusPill label="Eseti szerződés" value={draft.eszerz} />
              <Field label="Eseti szerződés lejárata" value={draft.eszerz_lejar} editing={false} />
              <StatusPill label="Üzemorvosi" value={draft.uzemorv} />
              <Field label="Üzemorvosi lejárata" value={draft.uzemorv_lejar} editing={false} />
              <StatusPill label="Tüdőszűrő" value={draft.tudo} />
              <Field label="Tüdőszűrő lejárata" value={draft.tudo_lejar} editing={false} />
            </div>
          )}

          {tab === "dokumentum" && (
            <div>
              {draft.dokumentumok.length === 0 ? (
                <div style={{ color: "#9A9584", fontSize: 13.5 }}>Nincs feltöltött dokumentum.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {draft.dokumentumok.map((d) => (
                    <div key={d} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      border: "1px solid #E4E0D6", borderRadius: 8, fontSize: 13.5,
                    }}>
                      <FileText size={15} color="#B8863F" /> {d}
                    </div>
                  ))}
                </div>
              )}
              <button style={{ ...btnGhost, marginTop: 14 }}>
                <Plus size={14} /> Dokumentum feltöltése
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewMemberModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ nev: "", adoszam: "", email: "", telefon: "", iroda: OFFICES[0], iskola: SCHOOLS[0] });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.nev.trim() && form.adoszam.trim() && form.email.trim();

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...card, width: 460, padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1C2536" }}>Új tag felvétele</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9A9584" }}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <LabeledInput label="Név *" value={form.nev} onChange={set("nev")} />
          <LabeledInput label="Adószám *" value={form.adoszam} onChange={set("adoszam")} />
          <LabeledInput label="E-mail *" value={form.email} onChange={set("email")} />
          <LabeledInput label="Telefonszám" value={form.telefon} onChange={set("telefon")} />
          <div style={{ display: "flex", gap: 10 }}>
            <LabeledSelect label="Iroda" value={form.iroda} onChange={set("iroda")} options={OFFICES} />
            <LabeledSelect label="Iskola" value={form.iskola} onChange={set("iskola")} options={SCHOOLS} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button style={btnGhost} onClick={onClose}>Mégse</button>
          <button
            style={{ ...btnPrimary, opacity: valid ? 1 : 0.5, cursor: valid ? "pointer" : "not-allowed" }}
            disabled={!valid}
            onClick={() => valid && onCreate(form)}
          >
            <UserPlus size={14} /> Tag létrehozása
          </button>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <span style={labelStyle}>{label}</span>
      <input value={value} onChange={onChange} style={inputStyle} />
    </label>
  );
}
function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <span style={labelStyle}>{label}</span>
      <select value={value} onChange={onChange} style={inputStyle}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Toast({ text, onDone }) {
  React.useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
      background: "#1C2536", color: "#F6F4EF", padding: "11px 18px", borderRadius: 10,
      fontSize: 13.5, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,.18)", zIndex: 60,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <Check size={15} color="#E9C989" /> {text}
    </div>
  );
}

export default function SamTagokMock() {
  const [students, setStudents] = useState(seedStudents);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("mind");
  const [officeFilter, setOfficeFilter] = useState("mind");
  const [checked, setChecked] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter !== "mind" && s.tagsag !== statusFilter) return false;
      if (officeFilter !== "mind" && s.iroda !== officeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!s.nev.toLowerCase().includes(q) && !s.adoszam.includes(q) && !s.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [students, search, statusFilter, officeFilter]);

  const selected = students.find((s) => s.id === selectedId);

  const toggleCheck = (id) => setChecked((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  const toggleAll = () => setChecked(checked.length === filtered.length ? [] : filtered.map((s) => s.id));

  const saveStudent = (updated) => {
    setStudents((list) => list.map((s) => s.id === updated.id ? updated : s));
    setToast("A profil módosításai mentve.");
  };

  const runBulk = (label, apply) => {
    if (checked.length === 0) { setToast("Előbb jelölj ki legalább egy tagot."); setShowActions(false); return; }
    setStudents((list) => list.map((s) => checked.includes(s.id) ? apply(s) : s));
    setToast(`${label} — ${checked.length} tag frissítve.`);
    setChecked([]);
    setShowActions(false);
  };

  const createStudent = (form) => {
    const id = Math.max(...students.map((s) => s.id)) + 1;
    setStudents((list) => [{
      id, nev: form.nev, adoszam: form.adoszam, taj: "", email: form.email, telefon: form.telefon,
      szuldat: "", lakcim: "", iroda: form.iroda, iskola: form.iskola, diakig: "", diakig_ervenyes: "",
      tagsag: "piszkozat", belepes: null, kilepes: null, reszjegy: 0, bank: "nincs", eszerz: "nincs",
      eszerz_lejar: null, uzemorv: "nincs", uzemorv_lejar: null, tudo: "nincs", tudo_lejar: null, dokumentumok: [],
    }, ...list]);
    setShowNew(false);
    setToast(`${form.nev} felvéve piszkozat státusszal.`);
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif",
      background: "#F6F4EF", minHeight: 640, display: "flex", color: "#232619",
      borderRadius: 14, overflow: "hidden", border: "1px solid #E4E0D6",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* Sidebar */}
      <div style={{ width: 208, background: "#1C2536", color: "#CBD0DA", padding: "20px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 22px", borderBottom: "1px solid #2C3750", marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "#E9C989", color: "#1C2536", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>M</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>SAM</span>
        </div>
        {[
          { label: "Szövetkezeti tagok", icon: Users, active: true },
          { label: "Partnerek", icon: Building2, active: false },
          { label: "Projektek", icon: FolderOpen, active: false },
          { label: "Bérszámfejtés", icon: Briefcase, active: false },
        ].map((item) => (
          <div key={item.label} style={{
            display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, marginBottom: 2, cursor: "pointer",
            background: item.active ? "#2C3750" : "transparent", color: item.active ? "#fff" : "#9AA1B4",
          }}>
            <item.icon size={15} /> {item.label}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "22px 26px", overflow: "auto" }}>
        {selected ? (
          <ProfileView student={selected} onBack={() => setSelectedId(null)} onSave={saveStudent} />
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1C2536" }}>Szövetkezeti tagok</div>
                <div style={{ fontSize: 13, color: "#8A8570", marginTop: 2 }}>{filtered.length} tag a szűrésnek megfelelően · {students.length} összesen</div>
              </div>
              <div style={{ display: "flex", gap: 8, position: "relative" }}>
                <button style={btnGhost} onClick={() => setShowActions((v) => !v)}>
                  Műveletek <ChevronDown size={14} />
                </button>
                {showActions && (
                  <div style={{
                    position: "absolute", top: 40, right: 92, background: "#fff", border: "1px solid #E4E0D6",
                    borderRadius: 10, boxShadow: "0 10px 28px rgba(20,20,10,.12)", width: 240, zIndex: 30, padding: 6,
                  }}>
                    <ActionItem icon={RefreshCw} label="Tömeges szinkronizálás" onClick={() => runBulk("Tömeges szinkronizálás", (s) => s)} />
                    <ActionItem icon={Ban} label="Tömeges lezárás" onClick={() => runBulk("Tömeges lezárás", (s) => ({ ...s, tagsag: "érvénytelen" }))} />
                    <ActionItem icon={LogOut} label="Tömeges kiléptetés" onClick={() => runBulk("Tömeges kiléptetés", (s) => ({ ...s, tagsag: "érvénytelen", kilepes: "2026.07.01" }))} />
                    <div style={{ height: 1, background: "#E4E0D6", margin: "6px 4px" }} />
                    <ActionItem icon={Download} label="Tag adat export" onClick={() => { setToast("Export elindítva (.xlsx)."); setShowActions(false); }} />
                    <ActionItem icon={Download} label="Módosítás napló export" onClick={() => { setToast("Export elindítva (.xlsx)."); setShowActions(false); }} />
                    <ActionItem icon={Download} label="Tagdíj befizetési lista" onClick={() => { setToast("Export elindítva (.xlsx)."); setShowActions(false); }} />
                  </div>
                )}
                <button style={btnPrimary} onClick={() => setShowNew(true)}>
                  <Plus size={15} /> Új tag
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ ...card, marginTop: 18, padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 220px" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: 9.5, color: "#9A9584" }} />
                <input
                  placeholder="Keresés név, adószám vagy e-mail alapján…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 32, width: "100%" }}
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                <option value="mind">Minden tagság státusz</option>
                <option value="érvényes">érvényes</option>
                <option value="érvénytelen">érvénytelen</option>
                <option value="piszkozat">piszkozat</option>
              </select>
              <select value={officeFilter} onChange={(e) => setOfficeFilter(e.target.value)} style={inputStyle}>
                <option value="mind">Minden iroda</option>
                {OFFICES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <button style={btnGhost}><Filter size={14} /> Részletes kereső</button>
            </div>

            {/* Table */}
            <div style={{ ...card, marginTop: 14, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: "#FAF8F3", borderBottom: "1px solid #E4E0D6" }}>
                    <th style={{ ...th, width: 34 }}>
                      <input type="checkbox" checked={checked.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
                    </th>
                    <th style={th}>Név</th>
                    <th style={th}>Adószám</th>
                    <th style={th}>Iroda</th>
                    <th style={th}>Iskola</th>
                    <th style={th}>Tagság státusz</th>
                    <th style={th}>Figyelmeztetések</th>
                    <th style={{ ...th, width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      style={{ borderBottom: "1px solid #EFECE3", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#FBFAF6")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={checked.includes(s.id)} onChange={() => toggleCheck(s.id)} />
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: "#1C2536" }} onClick={() => setSelectedId(s.id)}>{s.nev}</td>
                      <td style={td} onClick={() => setSelectedId(s.id)}>{s.adoszam}</td>
                      <td style={td} onClick={() => setSelectedId(s.id)}>{s.iroda}</td>
                      <td style={td} onClick={() => setSelectedId(s.id)}>{s.iskola}</td>
                      <td style={td} onClick={() => setSelectedId(s.id)}><StatusBadge status={s.tagsag} /></td>
                      <td style={td} onClick={() => setSelectedId(s.id)}><WarningBadges s={s} /></td>
                      <td style={td} onClick={() => setSelectedId(s.id)}><ChevronRight size={15} color="#B0AB98" /></td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#9A9584", padding: 28 }}>Nincs a szűrésnek megfelelő tag.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showNew && <NewMemberModal onClose={() => setShowNew(false)} onCreate={createStudent} />}
      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}

function ActionItem({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px",
        background: "none", border: "none", borderRadius: 7, cursor: "pointer",
        fontSize: 13, color: "#333", textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#F6F4EF")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={14} color="#8A8570" /> {label}
    </button>
  );
}

const card = { background: "#fff", border: "1px solid #E4E0D6", borderRadius: 12 };
const grid3 = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "18px 22px" };
const labelStyle = { fontSize: 11, fontWeight: 600, color: "#8A8570", textTransform: "uppercase", letterSpacing: ".04em" };
const inputStyle = { font: "inherit", fontSize: 13.5, padding: "8px 10px", borderRadius: 8, border: "1px solid #D8D3C4", outline: "none", background: "#fff", color: "#232619" };
const th = { textAlign: "left", padding: "10px 12px", fontSize: 11.5, fontWeight: 700, color: "#8A8570", textTransform: "uppercase", letterSpacing: ".03em" };
const td = { padding: "11px 12px", color: "#3A3A2E" };
const btnGhost = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9, border: "1px solid #D8D3C4", background: "#fff", color: "#3A3A2E", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const btnPrimary = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid #1C2536", background: "#1C2536", color: "#F6F4EF", fontSize: 13, fontWeight: 600, cursor: "pointer" };
const overlay = { position: "fixed", inset: 0, background: "rgba(20,20,10,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 };
