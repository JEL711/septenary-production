import { useState, useEffect, useRef } from "react";

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const ACCESS_CODE = "7Group";
const BRAND = { black: "#0d0d0d", dark: "#111114", mid: "#1a1a1e", red: "#c0392b", redL: "#e74c3c", silver: "#b8b8c0", silverD: "#8a8a94", white: "#f0f0f2" };

// ─── STORAGE ───
const DB = {
  async get(key) { try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; } catch { return null; } },
  async set(key, val) { try { await window.storage.set(key, JSON.stringify(val), true); } catch {} }
};

// ─── AI ───
async function genQuestions(client, type, summary) {
  if (!CLAUDE_API_KEY) throw new Error("No API key — add VITE_CLAUDE_API_KEY to .env");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": CLAUDE_API_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 600,
      system: "You are a production strategist for Septenary Group. Generate interview questions for video shoots. Questions should be conversational, emotionally resonant, designed to pull authentic soundbites. Return ONLY a JSON array of strings.",
      messages: [{ role: "user", content: `Generate 8-10 interview questions for a ${type} video.\nClient: ${client}\nContext: ${summary}\nReturn only a JSON array.` }]
    })
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const d = await r.json();
  return JSON.parse(d.content[0].text.replace(/```json|```/g, "").trim());
}

// ─── DATA ───
const DEF_CLIENTS = [
  { id: "c1", name: "Phil Steinberg", company: "Schatz, Steinberg & Klayman", industry: "Legal / Criminal Defense", color: "#c9a227" },
  { id: "c2", name: "W.O.N.", company: "Williams Outreach Network", industry: "Nonprofit / Youth Agriculture", color: "#27a844" },
];
const DEF_PROJECTS = [{
  id: "p1", clientId: "c1", title: "Client Testimonial - Marcus T.", type: "Testimonial", status: "Pre-Production",
  shootDate: "2026-03-22", shootTime: "10:00 AM", location: "SSK Office - 1500 JFK Blvd, Suite 1300, Philadelphia",
  people: [{ id: "t1", name: "Marcus T.", role: "Former Client (Acquitted 2023)", phone: "", email: "", notes: "Prefers morning shoots.", confirmed: true }],
  questions: ["What was your first impression of Phil?", "How did Phil's approach differ from other attorneys?", "What would you tell someone facing similar charges?", "Describe the moment you heard the verdict.", "What does Phil Steinberg mean to your family?"],
  shotList: ["Wide establishing - office exterior", "Medium - talent seated", "Close-up - emotional moments", "B-roll - Phil in office", "B-roll - signage, awards", "Two-shot - handshake"],
  equipment: ["Sony A7IV", "Rode NTG5", "Aputure 300D", "2x Softbox", "Lav backup", "Tripod + Gimbal"],
  links: [{ label: "Google Drive", url: "" }, { label: "Frame.io", url: "" }],
  deliverables: [{ name: "60s Testimonial", status: "Not Started" }, { name: "30s Cut", status: "Not Started" }, { name: "Full Interview", status: "Not Started" }, { name: "Quote Stills x3", status: "Not Started" }],
  notes: "Phil reviews all cuts. No case details on camera. PA Bar compliance.", summary: "Criminal defense testimonial from acquitted former client. Trust-focused narrative.", createdAt: "2026-03-09"
}];
const STATUSES = ["Pre-Production", "Scheduled", "Shooting", "In Edit", "Review", "Delivered", "Archived"];
const TYPES = ["Testimonial", "Commercial", "Brand Film", "Social Content", "Event Coverage", "Interview", "BTS / Documentary"];
const DEL_ST = ["Not Started", "In Progress", "In Review", "Approved", "Published"];
const ST_COL = { "Pre-Production": "#f59e0b", Scheduled: "#3b82f6", Shooting: "#e74c3c", "In Edit": "#a855f7", Review: "#f97316", Delivered: "#4ade80", Archived: "#6b7280" };

// ─── STYLES ───
const inp = (extra) => ({ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: BRAND.white, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans',sans-serif", ...extra });
const lbl = { fontSize: 10, color: BRAND.silverD, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" };

// ─── ACCESS GATE ───
function AccessGate({ onUnlock }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const submit = () => {
    if (code === ACCESS_CODE) { sessionStorage.setItem("sep-auth", "1"); onUnlock(); }
    else { setError(true); setShake(true); setTimeout(() => setShake(false), 500); }
  };
  return (
    <div style={{ minHeight: "100vh", background: BRAND.black, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ textAlign: "center", maxWidth: 360, width: "100%", animation: shake ? "shake 0.5s ease" : "none" }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: `linear-gradient(135deg, ${BRAND.red}, #8b1a1a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "'Bebas Neue',sans-serif", margin: "0 auto 16px" }}>S</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.white, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 2, textTransform: "uppercase" }}>Septenary</div>
        <div style={{ fontSize: 10, color: BRAND.red, textTransform: "uppercase", letterSpacing: 4, marginBottom: 32, fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>Production AI</div>
        <input value={code} onChange={e => { setCode(e.target.value); setError(false); }} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Enter access code" type="password"
          style={{ ...inp({ textAlign: "center", fontSize: 16, letterSpacing: 2, marginBottom: 12, border: error ? "1px solid #e74c3c" : "1px solid rgba(255,255,255,0.08)" }) }} autoFocus />
        {error && <div style={{ fontSize: 12, color: BRAND.redL, marginBottom: 12, fontFamily: "'DM Sans',sans-serif" }}>Invalid code</div>}
        <button onClick={submit} style={{ width: "100%", padding: 14, borderRadius: 8, border: "none", background: BRAND.red, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Enter</button>
        <style>{`@keyframes shake { 0%,100% {transform:translateX(0)} 25% {transform:translateX(-8px)} 75% {transform:translateX(8px)} }`}</style>
      </div>
    </div>
  );
}

// ─── LIST EDITOR ───
function ListEd({ items, onChange, ph }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 5, alignItems: "center" }}>
          <span style={{ color: BRAND.silverD, fontSize: 11, minWidth: 18 }}>{i + 1}.</span>
          <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }} placeholder={ph}
            style={inp({ padding: "8px 10px", fontSize: 13 })} />
          <button onClick={() => onChange(items.filter((_, x) => x !== i))} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 16, padding: "4px 8px" }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} style={{ background: "none", border: "none", color: BRAND.silverD, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", padding: "6px 0" }}>+ Add</button>
    </div>
  );
}

// ─── PERSON CARD (Mobile-friendly) ───
function PersonCard({ person, onUpdate, onRemove, color }) {
  const f = (k, v) => onUpdate({ ...person, [k]: v });
  const ini = person.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color, fontFamily: "'Bebas Neue',sans-serif", flexShrink: 0 }}>{ini}</div>
        <input value={person.name} onChange={e => f("name", e.target.value)} placeholder="Full Name" style={{ flex: 1, background: "none", border: "none", color: BRAND.white, fontSize: 16, fontWeight: 600, outline: "none", fontFamily: "'DM Sans',sans-serif", minWidth: 0 }} />
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.35)", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <button onClick={() => f("confirmed", !person.confirmed)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", background: person.confirmed ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", color: person.confirmed ? "#4ade80" : BRAND.silverD, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
          {person.confirmed ? "✓ Confirmed" : "Unconfirmed"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input value={person.role} onChange={e => f("role", e.target.value)} placeholder="Role (e.g. Former Client)" style={inp({ padding: "8px 10px", fontSize: 13 })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <input value={person.phone} onChange={e => f("phone", e.target.value)} placeholder="Phone" style={inp({ padding: "8px 10px", fontSize: 13 })} />
          <input value={person.email} onChange={e => f("email", e.target.value)} placeholder="Email" style={inp({ padding: "8px 10px", fontSize: 13 })} />
        </div>
        <input value={person.notes} onChange={e => f("notes", e.target.value)} placeholder="Notes..." style={inp({ padding: "8px 10px", fontSize: 13 })} />
      </div>
    </div>
  );
}

// ─── MAIN ───
export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("sep-auth") === "1");
  const [clients, setClients] = useState(DEF_CLIENTS);
  const [projects, setProjects] = useState(DEF_PROJECTS);
  const [activePid, setActivePid] = useState("p1");
  const [tab, setTab] = useState("overview");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [filterCid, setFilterCid] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveRef = useRef(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap";
    l.rel = "stylesheet"; document.head.appendChild(l);
    // Add viewport meta for mobile
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement("meta"); vp.name = "viewport"; document.head.appendChild(vp); }
    vp.content = "width=device-width, initial-scale=1, maximum-scale=1";
    (async () => {
      const [c, p] = await Promise.all([DB.get("prod-clients"), DB.get("prod-projects")]);
      if (c) setClients(c); if (p && p.length) { setProjects(p); setActivePid(p[0].id); }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => { DB.set("prod-clients", clients); DB.set("prod-projects", projects); }, 600);
  }, [clients, projects, loaded]);

  if (!authed) return <AccessGate onUnlock={() => setAuthed(true)} />;
  if (!loaded) return <div style={{ minHeight: "100vh", background: BRAND.black, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.silverD }}>Loading...</div>;

  const proj = projects.find(p => p.id === activePid) || projects[0];
  const pClient = clients.find(c => c.id === proj?.clientId);
  const upd = (k, v) => setProjects(prev => prev.map(p => p.id === activePid ? { ...p, [k]: v } : p));
  const filtered = filterCid === "all" ? projects : projects.filter(p => p.clientId === filterCid);

  const addProj = (cid) => {
    const np = { id: `p${Date.now()}`, clientId: cid, title: "New Shoot", type: "Testimonial", status: "Pre-Production", shootDate: "", shootTime: "", location: "", people: [], questions: [], shotList: [], equipment: [], links: [{ label: "Google Drive", url: "" }], deliverables: [], notes: "", summary: "", createdAt: new Date().toISOString().split("T")[0] };
    setProjects(prev => [...prev, np]); setActivePid(np.id); setTab("overview"); setShowSidebar(false);
  };

  const delProj = () => { if (projects.length <= 1) return; const remaining = projects.filter(p => p.id !== activePid); setProjects(remaining); setActivePid(remaining[0].id); };

  const handleAi = async () => {
    if (!proj.summary.trim()) { setAiErr("Add a project summary first."); return; }
    setAiLoading(true); setAiErr(null);
    try { const qs = await genQuestions(pClient?.name || proj.title, proj.type, proj.summary); upd("questions", [...proj.questions, ...qs]); } catch (e) { setAiErr(e.message); }
    setAiLoading(false);
  };

  const tabs = ["overview", "people", "creative", "links", "deliverables"];

  // ─── SIDEBAR CONTENT ───
  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BRAND.dark }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px 8px" }}>
        <div style={{ width: 30, height: 30, borderRadius: 6, background: `linear-gradient(135deg, ${BRAND.red}, #8b1a1a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Bebas Neue',sans-serif" }}>S</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: BRAND.white, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Bebas Neue',sans-serif" }}>Septenary</div>
          <div style={{ fontSize: 7, color: BRAND.red, textTransform: "uppercase", letterSpacing: 3, fontWeight: 700 }}>Production AI</div>
        </div>
        <button onClick={() => setShowSidebar(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: BRAND.silverD, fontSize: 20, cursor: "pointer", display: "none", "@media(maxWidth:768px)": { display: "block" } }}>×</button>
      </div>

      <div style={{ padding: "10px 12px 4px" }}>
        <select value={filterCid} onChange={e => setFilterCid(e.target.value)} style={inp({ padding: "8px 10px", fontSize: 12 })}>
          <option value="all" style={{ background: "#111" }}>All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id} style={{ background: "#111" }}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
        {clients.filter(c => filterCid === "all" || c.id === filterCid).map(client => {
          const cp = filtered.filter(p => p.clientId === client.id);
          return (
            <div key={client.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: client.color }} />
                  <span style={{ fontSize: 11, color: BRAND.silverD, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{client.name}</span>
                </div>
                <button onClick={() => addProj(client.id)} style={{ background: "none", border: "none", color: BRAND.silverD, fontSize: 16, cursor: "pointer" }}>+</button>
              </div>
              {cp.map(p => (
                <button key={p.id} onClick={() => { setActivePid(p.id); setTab("overview"); setShowSidebar(false); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 10px 22px", borderRadius: 8, border: "none", background: activePid === p.id ? "rgba(255,255,255,0.06)" : "transparent", cursor: "pointer", marginBottom: 1, textAlign: "left" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: ST_COL[p.status], flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: activePid === p.id ? BRAND.white : BRAND.silver, fontWeight: activePid === p.id ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: BRAND.silverD }}>{p.type} · {p.status}</div>
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 6 }}>
        <button onClick={() => setShowNewClient(true)} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${BRAND.red}33`, background: `${BRAND.red}10`, color: BRAND.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Client</button>
        <button onClick={() => { if (clients.length) addProj(clients[0].id); }} style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: BRAND.silver, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Shoot</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: BRAND.black, color: BRAND.white, fontFamily: "'DM Sans',sans-serif" }}>

      {/* Mobile overlay sidebar */}
      {showSidebar && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex" }}>
          <div style={{ width: 300, maxWidth: "85vw", height: "100%", boxShadow: "4px 0 20px rgba(0,0,0,0.5)" }}>{sidebarContent}</div>
          <div onClick={() => setShowSidebar(false)} style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} />
        </div>
      )}

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Desktop sidebar */}
        <div className="desk-sidebar" style={{ width: 270, minWidth: 270, height: "100vh", position: "sticky", top: 0, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
          {sidebarContent}
        </div>

        {/* Main */}
        {proj ? (
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto", height: "100vh" }}>
            {/* Header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "sticky", top: 0, background: BRAND.black, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <button className="mob-menu" onClick={() => setShowSidebar(true)} style={{ background: "none", border: "none", color: BRAND.silver, fontSize: 20, cursor: "pointer", padding: "4px 8px", display: "none" }}>☰</button>
                <input value={proj.title} onChange={e => upd("title", e.target.value)}
                  style={{ flex: 1, background: "none", border: "none", color: BRAND.white, fontSize: 20, fontWeight: 700, fontFamily: "'Bebas Neue',sans-serif", outline: "none", letterSpacing: 1, minWidth: 0 }} />
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {pClient && <span style={{ fontSize: 12, color: pClient.color, fontWeight: 600 }}>{pClient.name}</span>}
                <select value={proj.type} onChange={e => upd("type", e.target.value)} style={inp({ width: "auto", padding: "4px 8px", fontSize: 11 })}>
                  {TYPES.map(t => <option key={t} value={t} style={{ background: "#111" }}>{t}</option>)}
                </select>
                <select value={proj.status} onChange={e => upd("status", e.target.value)}
                  style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${ST_COL[proj.status]}44`, background: `${ST_COL[proj.status]}12`, color: ST_COL[proj.status], fontSize: 11, fontWeight: 600, outline: "none", fontFamily: "'DM Sans',sans-serif" }}>
                  {STATUSES.map(s => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
                </select>
                <button onClick={delProj} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)", background: "transparent", color: "rgba(239,68,68,0.35)", fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>✕</button>
              </div>
            </div>

            {/* Tabs - scrollable on mobile */}
            <div style={{ padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: "12px 14px", border: "none", borderBottom: tab === t ? `2px solid ${BRAND.red}` : "2px solid transparent", background: "none", color: tab === t ? BRAND.white : BRAND.silverD, fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ padding: 16 }}>

              {tab === "overview" && (
                <div>
                  <div style={lbl}>Shoot Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    <div><div style={{ fontSize: 9, color: BRAND.silverD, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Date</div><input type="date" value={proj.shootDate} onChange={e => upd("shootDate", e.target.value)} style={inp({})} /></div>
                    <div><div style={{ fontSize: 9, color: BRAND.silverD, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Time</div><input value={proj.shootTime} onChange={e => upd("shootTime", e.target.value)} placeholder="10:00 AM" style={inp({})} /></div>
                  </div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontSize: 9, color: BRAND.silverD, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Location</div><input value={proj.location} onChange={e => upd("location", e.target.value)} placeholder="Shoot location..." style={inp({})} /></div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontSize: 9, color: BRAND.silverD, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Project Summary (AI uses this for questions)</div><textarea value={proj.summary} onChange={e => upd("summary", e.target.value)} placeholder="Brief description — who, what, why..." style={inp({ minHeight: 80, resize: "vertical" })} /></div>
                  <div style={{ marginBottom: 14 }}><div style={{ fontSize: 9, color: BRAND.silverD, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Production Notes</div><textarea value={proj.notes} onChange={e => upd("notes", e.target.value)} placeholder="Key notes for the team..." style={inp({ minHeight: 80, resize: "vertical" })} /></div>
                  <div style={lbl}>Equipment</div>
                  <ListEd items={proj.equipment} onChange={v => upd("equipment", v)} ph="Add gear..." />
                  <div style={{ ...lbl, marginTop: 18 }}>Quick Status</div>
                  {[["People", `${proj.people.length}`, `${proj.people.filter(t => t.confirmed).length} confirmed`], ["Questions", `${proj.questions.length}`, "ready"], ["Deliverables", `${proj.deliverables.filter(d => d.status === "Published").length}/${proj.deliverables.length}`, "done"], ["Links", `${proj.links.filter(l => l.url).length}/${proj.links.length}`, "set"]].map(([n, v, s]) => (
                    <div key={n} style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: BRAND.silverD }}>{n}</span>
                      <span style={{ fontSize: 13, color: BRAND.white, fontWeight: 600 }}>{v} <span style={{ color: BRAND.silverD, fontSize: 10, fontWeight: 400 }}>{s}</span></span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "people" && (
                <div>
                  <div style={lbl}>People on This Project</div>
                  {proj.people.map((p, i) => (
                    <PersonCard key={i} person={p} color={pClient?.color || BRAND.red}
                      onUpdate={u => { const n = [...proj.people]; n[i] = u; upd("people", n); }}
                      onRemove={() => upd("people", proj.people.filter((_, x) => x !== i))} />
                  ))}
                  <button onClick={() => upd("people", [...proj.people, { id: `t${Date.now()}`, name: "", role: "", phone: "", email: "", notes: "", confirmed: false }])}
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: BRAND.silverD, fontSize: 13, cursor: "pointer", marginTop: 8 }}>+ Add Person</button>
                </div>
              )}

              {tab === "creative" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <div style={lbl}>Interview Questions</div>
                    <button onClick={handleAi} disabled={aiLoading}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: aiLoading ? "rgba(255,255,255,0.06)" : BRAND.red, color: aiLoading ? BRAND.silverD : "#fff", fontSize: 12, fontWeight: 700, cursor: aiLoading ? "not-allowed" : "pointer" }}>
                      {aiLoading ? "Thinking..." : "⚡ AI Generate"}
                    </button>
                  </div>
                  {aiErr && <div style={{ padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{aiErr}</div>}
                  <ListEd items={proj.questions} onChange={v => upd("questions", v)} ph="Add question..." />
                  <div style={{ ...lbl, marginTop: 20 }}>Shot List</div>
                  <ListEd items={proj.shotList} onChange={v => upd("shotList", v)} ph="Add shot..." />
                </div>
              )}

              {tab === "links" && (
                <div>
                  <div style={lbl}>Editing & Software Links</div>
                  {proj.links.map((link, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <input value={link.label} onChange={e => { const n = [...proj.links]; n[i] = { ...n[i], label: e.target.value }; upd("links", n); }} placeholder="Label" style={inp({ padding: "8px 10px", fontSize: 13 })} />
                        <button onClick={() => upd("links", proj.links.filter((_, x) => x !== i))} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.35)", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>×</button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={link.url} onChange={e => { const n = [...proj.links]; n[i] = { ...n[i], url: e.target.value }; upd("links", n); }} placeholder="https://..." style={inp({ padding: "8px 10px", fontSize: 13 })} />
                        {link.url && <a href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding: "8px 14px", borderRadius: 8, background: `${BRAND.red}18`, border: `1px solid ${BRAND.red}33`, color: BRAND.red, fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0, display: "flex", alignItems: "center" }}>Open ↗</a>}
                      </div>
                    </div>
                  ))}
                  <button onClick={() => upd("links", [...proj.links, { label: "", url: "" }])}
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: BRAND.silverD, fontSize: 13, cursor: "pointer", marginTop: 6 }}>+ Add Link</button>
                </div>
              )}

              {tab === "deliverables" && (
                <div>
                  <div style={lbl}>Deliverables</div>
                  {proj.deliverables.map((d, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={d.name} onChange={e => { const n = [...proj.deliverables]; n[i] = { ...n[i], name: e.target.value }; upd("deliverables", n); }} placeholder="Deliverable..."
                          style={{ flex: 1, background: "none", border: "none", color: BRAND.white, fontSize: 14, outline: "none", minWidth: 0 }} />
                        <button onClick={() => upd("deliverables", proj.deliverables.filter((_, x) => x !== i))} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.35)", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>×</button>
                      </div>
                      <select value={d.status} onChange={e => { const n = [...proj.deliverables]; n[i] = { ...n[i], status: e.target.value }; upd("deliverables", n); }}
                        style={{ marginTop: 6, padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: d.status === "Published" ? "rgba(74,222,128,0.08)" : d.status === "Approved" ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)", color: d.status === "Published" ? "#4ade80" : d.status === "Approved" ? "#3b82f6" : BRAND.silverD, fontSize: 12, outline: "none", width: "100%" }}>
                        {DEL_ST.map(s => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
                      </select>
                    </div>
                  ))}
                  <button onClick={() => upd("deliverables", [...proj.deliverables, { name: "", status: "Not Started" }])}
                    style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: BRAND.silverD, fontSize: 13, cursor: "pointer", marginTop: 6 }}>+ Add Deliverable</button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.silverD }}>Select or create a project</div>
        )}
      </div>

      {/* New Client Modal */}
      {showNewClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: BRAND.dark, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420 }}>
            <NewClientForm onAdd={c => { setClients(prev => [...prev, c]); setShowNewClient(false); }} onClose={() => setShowNewClient(false)} />
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:768px) {
          .desk-sidebar { display:none !important; }
          .mob-menu { display:block !important; }
        }
        @media(min-width:769px) {
          .mob-menu { display:none !important; }
        }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:4px; }
      `}</style>
    </div>
  );
}

function NewClientForm({ onAdd, onClose }) {
  const [name, setName] = useState(""); const [company, setCompany] = useState(""); const [industry, setIndustry] = useState("");
  const colors = ["#c9a227", "#27a844", "#2780c9", "#c92770", "#8b5cf6", "#06b6d4", "#f59e0b"];
  const [color, setColor] = useState(colors[0]);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: BRAND.white, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1.5 }}>New Client</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: BRAND.silverD, fontSize: 20, cursor: "pointer" }}>×</button>
      </div>
      {[["Client Name", name, setName], ["Company", company, setCompany], ["Industry", industry, setIndustry]].map(([l, v, s]) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div style={lbl}>{l}</div>
          <input value={v} onChange={e => s(e.target.value)} style={inp({})} />
        </div>
      ))}
      <div style={{ marginBottom: 16 }}>
        <div style={lbl}>Color</div>
        <div style={{ display: "flex", gap: 8 }}>
          {colors.map(c => <button key={c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer" }} />)}
        </div>
      </div>
      <button onClick={() => { if (name.trim()) onAdd({ id: `c${Date.now()}`, name, company, industry, color }); }}
        style={{ width: "100%", padding: 14, borderRadius: 8, border: "none", background: BRAND.red, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Add Client</button>
    </>
  );
}
