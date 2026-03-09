import { useState, useEffect, useCallback, useRef } from "react";

// ─── CONFIG ───
const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const BRAND = {
  black: "#0d0d0d",
  darkGray: "#111114",
  midGray: "#1a1a1e",
  red: "#c0392b",
  redLight: "#e74c3c",
  silver: "#b8b8c0",
  silverDark: "#8a8a94",
  white: "#f0f0f2"
};

// ─── STORAGE LAYER (shared across all users of this artifact) ───
const DB = {
  async getClients() {
    try {
      const res = await window.storage.get("prod-clients", true);
      return res ? JSON.parse(res.value) : null;
    } catch { return null; }
  },
  async saveClients(clients) {
    try {
      await window.storage.set("prod-clients", JSON.stringify(clients), true);
    } catch (e) { console.error("Save failed:", e); }
  },
  async getProjects() {
    try {
      const res = await window.storage.get("prod-projects", true);
      return res ? JSON.parse(res.value) : null;
    } catch { return null; }
  },
  async saveProjects(projects) {
    try {
      await window.storage.set("prod-projects", JSON.stringify(projects), true);
    } catch (e) { console.error("Save failed:", e); }
  }
};

// ─── AI QUESTION GENERATOR ───
async function generateQuestions(clientName, projectType, summary) {
  if (!CLAUDE_API_KEY) throw new Error("No API key configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: `You are a production strategist for Septenary Group, a consultancy and media production firm. You generate interview questions for video testimonials, commercials, and brand films. Questions should be conversational, emotionally resonant, and designed to pull authentic, powerful soundbites. Never generic. Every question should serve the final edit. Return ONLY a JSON array of strings — no preamble, no markdown, no explanation.`,
      messages: [{ role: "user", content: `Generate 8-10 interview questions for a ${projectType} video.\n\nClient: ${clientName}\nContext: ${summary}\n\nReturn only a JSON array of question strings.` }]
    })
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = data.content[0].text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

// ─── DEFAULTS ───
const DEFAULT_CLIENTS = [
  { id: "c1", name: "Phil Steinberg", company: "Schatz, Steinberg & Klayman", industry: "Legal / Criminal Defense", color: "#c9a227" },
  { id: "c2", name: "W.O.N.", company: "Williams Outreach Network", industry: "Nonprofit / Youth Agriculture", color: "#27a844" },
];

const DEFAULT_PROJECTS = [
  {
    id: "p1", clientId: "c1", title: "Client Testimonial - Marcus T.",
    type: "Testimonial", status: "Pre-Production",
    shootDate: "2026-03-22", shootTime: "10:00 AM",
    location: "SSK Office - 1500 JFK Blvd, Suite 1300, Philadelphia",
    people: [
      { id: "t1", name: "Marcus T.", role: "Former Client (Acquitted 2023)", phone: "", email: "", notes: "Prefers morning shoots. Very willing to share his story.", confirmed: true },
    ],
    questions: [
      "What was your first impression of Phil?",
      "How did Phil's approach differ from other attorneys?",
      "What would you tell someone facing similar charges?",
      "Describe the moment you heard the verdict.",
      "What does Phil Steinberg mean to your family?"
    ],
    shotList: [
      "Wide establishing - office exterior",
      "Medium shot - talent seated, office background",
      "Close-up - emotional moments",
      "B-roll - Phil walking through office",
      "B-roll - firm signage, awards",
      "Two-shot - handshake (if comfortable)"
    ],
    equipment: ["Sony A7IV", "Rode NTG5", "Aputure 300D", "2x Softbox", "Lav mic backup", "Tripod + Gimbal"],
    links: [
      { label: "Google Drive - Raw Footage", url: "" },
      { label: "Frame.io Review", url: "" },
    ],
    deliverables: [
      { name: "60s Testimonial (Reels/TikTok)", status: "Not Started" },
      { name: "30s Cut (Stories/Ads)", status: "Not Started" },
      { name: "Full Interview (YouTube)", status: "Not Started" },
      { name: "Quote Card Stills x3", status: "Not Started" },
    ],
    notes: "Phil reviews all cuts before posting. No specific case details on camera. PA Bar compliance required.",
    summary: "Criminal defense testimonial from a former client who was acquitted of felony charges. Emotional, trust-focused narrative about Phil's dedication and courtroom skill.",
    createdAt: "2026-03-09"
  }
];

const STATUS_OPTIONS = ["Pre-Production", "Scheduled", "Shooting", "In Edit", "Review", "Delivered", "Archived"];
const TYPE_OPTIONS = ["Testimonial", "Commercial", "Brand Film", "Social Content", "Event Coverage", "Interview", "BTS / Documentary"];
const DEL_STATUS = ["Not Started", "In Progress", "In Review", "Approved", "Published"];
const STATUS_COLORS = { "Pre-Production": "#f59e0b", "Scheduled": "#3b82f6", "Shooting": "#e74c3c", "In Edit": "#a855f7", "Review": "#f97316", "Delivered": "#4ade80", "Archived": "#6b7280" };

// ─── COMPONENTS ───
function SeptenaryLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 18px 6px" }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg, ${BRAND.red}, #8b1a1a)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>S</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.white, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Bebas Neue', sans-serif" }}>Septenary</div>
        <div style={{ fontSize: 8, color: BRAND.red, textTransform: "uppercase", letterSpacing: 3, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>Production AI</div>
      </div>
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }) {
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
          <span style={{ color: BRAND.silverDark, fontSize: 10, minWidth: 18, fontFamily: "'Bebas Neue', sans-serif" }}>{i + 1}</span>
          <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; onChange(n); }} placeholder={placeholder}
            style={{ flex: 1, padding: "7px 10px", borderRadius: 4, border: `1px solid rgba(255,255,255,0.06)`, background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
          <button onClick={() => onChange(items.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 13 }}>×</button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} style={{ background: "none", border: "none", color: BRAND.silverDark, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>+ Add</button>
    </div>
  );
}

function PersonCard({ person, onUpdate, onRemove, clientColor }) {
  const f = (k, v) => onUpdate({ ...person, [k]: v });
  const initials = person.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${clientColor || BRAND.red}20`, border: `1px solid ${clientColor || BRAND.red}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: clientColor || BRAND.red, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 }}>{initials}</div>
        <input value={person.name} onChange={e => f("name", e.target.value)} placeholder="Full Name" style={{ flex: 1, background: "none", border: "none", color: BRAND.white, fontSize: 15, fontWeight: 600, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
        <button onClick={() => f("confirmed", !person.confirmed)} style={{ padding: "4px 12px", borderRadius: 20, border: "none", background: person.confirmed ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", color: person.confirmed ? "#4ade80" : BRAND.silverDark, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          {person.confirmed ? "✓ Confirmed" : "Unconfirmed"}
        </button>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.35)", cursor: "pointer", fontSize: 15 }}>×</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
        {[["role", "Role (e.g. Former Client)"], ["phone", "Phone"], ["email", "Email"]].map(([k, ph]) => (
          <input key={k} value={person[k]} onChange={e => f(k, e.target.value)} placeholder={ph}
            style={{ padding: "6px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: BRAND.silver, fontSize: 11, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
        ))}
      </div>
      <input value={person.notes} onChange={e => f("notes", e.target.value)} placeholder="Notes..." style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: BRAND.silverDark, fontSize: 11, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
    </div>
  );
}

// ─── NEW CLIENT MODAL ───
function NewClientModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const colors = ["#c9a227", "#27a844", "#2780c9", "#c92770", "#8b5cf6", "#06b6d4", "#f59e0b"];
  const [color, setColor] = useState(colors[0]);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: BRAND.darkGray, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 28, width: "90%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: BRAND.white, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1.5 }}>New Client</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: BRAND.silverDark, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        {[["Client / Subject Name", name, setName], ["Company / Organization", company, setCompany], ["Industry", industry, setIndustry]].map(([label, val, setter]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: BRAND.silverDark, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
            <input value={val} onChange={e => setter(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: BRAND.white, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, color: BRAND.silverDark, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>Accent Color</div>
          <div style={{ display: "flex", gap: 6 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: 6, background: c, border: color === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
        </div>
        <button onClick={() => { if (name.trim()) { onAdd({ id: `c${Date.now()}`, name, company, industry, color }); } }}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: BRAND.red, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Add Client
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function SeptenaryProduction() {
  const [clients, setClients] = useState(DEFAULT_CLIENTS);
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState("p1");
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewClient, setShowNewClient] = useState(false);
  const [filterClient, setFilterClient] = useState("all");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef(null);

  // Load from DB
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    (async () => {
      const [c, p] = await Promise.all([DB.getClients(), DB.getProjects()]);
      if (c) setClients(c);
      if (p) { setProjects(p); if (p.length > 0) setActiveProjectId(p[0].id); }
      setLoaded(true);
    })();
  }, []);

  // Auto-save with debounce
  useEffect(() => {
    if (!loaded) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      DB.saveClients(clients);
      DB.saveProjects(projects);
    }, 800);
  }, [clients, projects, loaded]);

  const project = projects.find(p => p.id === activeProjectId) || projects[0];
  const projectClient = clients.find(c => c.id === project?.clientId);

  const updateProject = (field, value) => {
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, [field]: value } : p));
  };

  const addProject = (clientId) => {
    const newP = {
      id: `p${Date.now()}`, clientId, title: "New Shoot",
      type: "Testimonial", status: "Pre-Production",
      shootDate: "", shootTime: "", location: "",
      people: [], questions: [], shotList: [], equipment: [],
      links: [{ label: "Google Drive", url: "" }, { label: "Review Link", url: "" }],
      deliverables: [], notes: "", summary: "",
      createdAt: new Date().toISOString().split("T")[0]
    };
    setProjects(prev => [...prev, newP]);
    setActiveProjectId(newP.id);
    setActiveTab("overview");
  };

  const deleteProject = () => {
    if (projects.length <= 1) return;
    setProjects(prev => prev.filter(p => p.id !== activeProjectId));
    setActiveProjectId(projects.find(p => p.id !== activeProjectId)?.id || projects[0].id);
  };

  const addClient = (client) => {
    setClients(prev => [...prev, client]);
    setShowNewClient(false);
  };

  const handleAiQuestions = async () => {
    if (!project.summary.trim()) { setAiError("Add a project summary first — the AI needs context to generate questions."); return; }
    setAiLoading(true); setAiError(null);
    try {
      const qs = await generateQuestions(projectClient?.name || project.title, project.type, project.summary);
      updateProject("questions", [...project.questions, ...qs]);
    } catch (e) { setAiError(e.message); }
    setAiLoading(false);
  };

  const filteredProjects = filterClient === "all" ? projects : projects.filter(p => p.clientId === filterClient);
  const tabs = ["overview", "people", "creative", "links", "deliverables"];
  const label = { fontSize: 9, color: BRAND.silverDark, textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 10, fontWeight: 700, fontFamily: "'DM Sans', sans-serif" };

  if (!loaded) return <div style={{ minHeight: "100vh", background: BRAND.black, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.silverDark, fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: BRAND.black, color: BRAND.white, fontFamily: "'DM Sans', sans-serif", display: "flex" }}>

      {/* ─── SIDEBAR ─── */}
      <div style={{ width: 270, minWidth: 270, background: BRAND.darkGray, borderRight: `1px solid rgba(255,255,255,0.04)`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
        <SeptenaryLogo />
        <div style={{ padding: "14px 14px 6px" }}>
          <div style={{ ...label, marginBottom: 6 }}>Filter by Client</div>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.silver, fontSize: 11, outline: "none", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}>
            <option value="all" style={{ background: "#111" }}>All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id} style={{ background: "#111" }}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ padding: "6px 8px", flex: 1, overflowY: "auto" }}>
          {clients.filter(c => filterClient === "all" || c.id === filterClient).map(client => {
            const clientProjects = filteredProjects.filter(p => p.clientId === client.id);
            if (filterClient !== "all" && clientProjects.length === 0 && filterClient !== client.id) return null;
            return (
              <div key={client.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: client.color }} />
                    <span style={{ fontSize: 10, color: BRAND.silverDark, textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>{client.name}</span>
                  </div>
                  <button onClick={() => addProject(client.id)} title="New shoot for this client" style={{ background: "none", border: "none", color: BRAND.silverDark, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
                {clientProjects.map(p => (
                  <button key={p.id} onClick={() => { setActiveProjectId(p.id); setActiveTab("overview"); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px 20px", borderRadius: 6, border: "none", background: activeProjectId === p.id ? "rgba(255,255,255,0.05)" : "transparent", cursor: "pointer", marginBottom: 1, textAlign: "left" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[p.status], flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: activeProjectId === p.id ? BRAND.white : BRAND.silver, fontWeight: activeProjectId === p.id ? 600 : 400 }}>{p.title}</div>
                      <div style={{ fontSize: 9, color: BRAND.silverDark }}>{p.type} · {p.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: 6 }}>
          <button onClick={() => setShowNewClient(true)} style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${BRAND.red}33`, background: `${BRAND.red}10`, color: BRAND.red, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Client</button>
          <button onClick={() => { if (clients.length > 0) addProject(clients[0].id); }} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: BRAND.silver, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>+ Shoot</button>
        </div>
      </div>

      {/* ─── MAIN ─── */}
      {project ? (
        <div style={{ flex: 1, overflowY: "auto", height: "100vh" }}>
          {/* Header */}
          <div style={{ padding: "18px 28px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: BRAND.black, zIndex: 10 }}>
            <div>
              <input value={project.title} onChange={e => updateProject("title", e.target.value)}
                style={{ background: "none", border: "none", color: BRAND.white, fontSize: 22, fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif", outline: "none", letterSpacing: 1 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                {projectClient && <span style={{ fontSize: 11, color: projectClient.color, fontWeight: 600 }}>{projectClient.name}</span>}
                {projectClient?.company && <span style={{ fontSize: 11, color: BRAND.silverDark }}>· {projectClient.company}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={project.clientId} onChange={e => updateProject("clientId", e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: BRAND.silver, fontSize: 10, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                {clients.map(c => <option key={c.id} value={c.id} style={{ background: "#111" }}>{c.name}</option>)}
              </select>
              <select value={project.type} onChange={e => updateProject("type", e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: BRAND.silver, fontSize: 10, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                {TYPE_OPTIONS.map(t => <option key={t} value={t} style={{ background: "#111" }}>{t}</option>)}
              </select>
              <select value={project.status} onChange={e => updateProject("status", e.target.value)}
                style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${STATUS_COLORS[project.status]}44`, background: `${STATUS_COLORS[project.status]}12`, color: STATUS_COLORS[project.status], fontSize: 10, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
              </select>
              <button onClick={deleteProject} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)", background: "transparent", color: "rgba(239,68,68,0.35)", fontSize: 11, cursor: "pointer" }}>✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex" }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ padding: "11px 16px", border: "none", borderBottom: activeTab === tab ? `2px solid ${BRAND.red}` : "2px solid transparent", background: "none", color: activeTab === tab ? BRAND.white : BRAND.silverDark, fontSize: 11, fontWeight: 500, cursor: "pointer", textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif" }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: 28 }}>

            {activeTab === "overview" && (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={label}>Shoot Details</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                    <div>
                      <div style={{ fontSize: 9, color: BRAND.silverDark, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Date</div>
                      <input type="date" value={project.shootDate} onChange={e => updateProject("shootDate", e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: BRAND.silverDark, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Time</div>
                      <input value={project.shootTime} onChange={e => updateProject("shootTime", e.target.value)} placeholder="e.g. 10:00 AM"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 9, color: BRAND.silverDark, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Location</div>
                    <input value={project.location} onChange={e => updateProject("location", e.target.value)} placeholder="Shoot location..."
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 9, color: BRAND.silverDark, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Project Summary (used by AI to generate questions)</div>
                    <textarea value={project.summary} onChange={e => updateProject("summary", e.target.value)} placeholder="Brief description of this shoot — who, what, why. The AI uses this to generate tailored interview questions..."
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", minHeight: 80, resize: "vertical" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: BRAND.silverDark, marginBottom: 3, letterSpacing: 1, textTransform: "uppercase" }}>Production Notes</div>
                    <textarea value={project.notes} onChange={e => updateProject("notes", e.target.value)} placeholder="Key notes for the team..."
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", minHeight: 100, resize: "vertical" }} />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={label}>Equipment</div>
                  <ListEditor items={project.equipment} onChange={v => updateProject("equipment", v)} placeholder="Add gear..." />
                  <div style={{ ...label, marginTop: 22 }}>Status Overview</div>
                  {[
                    ["People", `${project.people.length}`, `${project.people.filter(t => t.confirmed).length} confirmed`],
                    ["Questions", `${project.questions.length}`, "prepared"],
                    ["Deliverables", `${project.deliverables.filter(d => d.status === "Published").length}/${project.deliverables.length}`, "complete"],
                    ["Links", `${project.links.filter(l => l.url).length}/${project.links.length}`, "connected"],
                  ].map(([name, val, sub]) => (
                    <div key={name} style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: BRAND.silverDark }}>{name}</span>
                      <span style={{ fontSize: 12, color: BRAND.white, fontWeight: 600 }}>{val} <span style={{ fontWeight: 400, color: BRAND.silverDark, fontSize: 10 }}>{sub}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "people" && (
              <div>
                <div style={label}>People on This Project</div>
                {project.people.map((p, i) => (
                  <PersonCard key={i} person={p} clientColor={projectClient?.color}
                    onUpdate={u => { const n = [...project.people]; n[i] = u; updateProject("people", n); }}
                    onRemove={() => updateProject("people", project.people.filter((_, idx) => idx !== i))} />
                ))}
                <button onClick={() => updateProject("people", [...project.people, { id: `t${Date.now()}`, name: "", role: "", phone: "", email: "", notes: "", confirmed: false }])}
                  style={{ padding: "10px 20px", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.08)", background: "transparent", color: BRAND.silverDark, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 8 }}>
                  + Add Person
                </button>
              </div>
            )}

            {activeTab === "creative" && (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={label}>Interview Questions</div>
                    <button onClick={handleAiQuestions} disabled={aiLoading}
                      style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: aiLoading ? "rgba(255,255,255,0.06)" : BRAND.red, color: aiLoading ? BRAND.silverDark : "#fff", fontSize: 10, fontWeight: 700, cursor: aiLoading ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      {aiLoading ? "Generating..." : "⚡ AI Generate Questions"}
                    </button>
                  </div>
                  {aiError && <div style={{ padding: 10, borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#ef4444", marginBottom: 10 }}>{aiError}</div>}
                  <ListEditor items={project.questions} onChange={v => updateProject("questions", v)} placeholder="Add question..." />
                </div>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={label}>Shot List</div>
                  <ListEditor items={project.shotList} onChange={v => updateProject("shotList", v)} placeholder="Add shot..." />
                </div>
              </div>
            )}

            {activeTab === "links" && (
              <div>
                <div style={label}>Editing & Software Links</div>
                {project.links.map((link, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <input value={link.label} onChange={e => { const n = [...project.links]; n[i] = { ...n[i], label: e.target.value }; updateProject("links", n); }} placeholder="Label"
                      style={{ width: 180, padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.white, fontSize: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
                    <input value={link.url} onChange={e => { const n = [...project.links]; n[i] = { ...n[i], url: e.target.value }; updateProject("links", n); }} placeholder="https://..."
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: BRAND.silver, fontSize: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
                    {link.url && <a href={link.url.startsWith("http") ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer"
                      style={{ padding: "6px 12px", borderRadius: 6, background: `${BRAND.red}18`, border: `1px solid ${BRAND.red}33`, color: BRAND.red, fontSize: 10, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>Open ↗</a>}
                    <button onClick={() => updateProject("links", project.links.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.35)", cursor: "pointer", fontSize: 13 }}>×</button>
                  </div>
                ))}
                <button onClick={() => updateProject("links", [...project.links, { label: "", url: "" }])}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px dashed rgba(255,255,255,0.08)", background: "transparent", color: BRAND.silverDark, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>+ Add Link</button>
              </div>
            )}

            {activeTab === "deliverables" && (
              <div>
                <div style={label}>Deliverables Tracker</div>
                {project.deliverables.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center", padding: "10px 14px", borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <input value={d.name} onChange={e => { const n = [...project.deliverables]; n[i] = { ...n[i], name: e.target.value }; updateProject("deliverables", n); }} placeholder="Deliverable name..."
                      style={{ flex: 1, background: "none", border: "none", color: BRAND.white, fontSize: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
                    <select value={d.status} onChange={e => { const n = [...project.deliverables]; n[i] = { ...n[i], status: e.target.value }; updateProject("deliverables", n); }}
                      style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: d.status === "Published" ? "rgba(74,222,128,0.08)" : d.status === "Approved" ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)", color: d.status === "Published" ? "#4ade80" : d.status === "Approved" ? "#3b82f6" : BRAND.silverDark, fontSize: 10, fontFamily: "'DM Sans', sans-serif", outline: "none" }}>
                      {DEL_STATUS.map(s => <option key={s} value={s} style={{ background: "#111" }}>{s}</option>)}
                    </select>
                    <button onClick={() => updateProject("deliverables", project.deliverables.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.35)", cursor: "pointer", fontSize: 13 }}>×</button>
                  </div>
                ))}
                <button onClick={() => updateProject("deliverables", [...project.deliverables, { name: "", status: "Not Started" }])}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px dashed rgba(255,255,255,0.08)", background: "transparent", color: BRAND.silverDark, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: 6 }}>+ Add Deliverable</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: BRAND.silverDark }}>Select or create a project</div>
      )}

      {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} onAdd={addClient} />}
    </div>
  );
}
