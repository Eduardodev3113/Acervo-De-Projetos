import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

type Screen = "home" | "archive" | "detail" | "continuity" | "register" | "mine";
type Project = {
  id?: string;
  name: string;
  class: string;
  year: string;
  tech: string[];
  resources?: string[];
  area?: string;
  status: string;
  description: string;
  objective?: string;
  results?: string;
  team?: string[];
  attachments?: string[];
  mineStatus?: string;
  versionOf?: string;
  plan?: string;
  dueDate?: string;
};

const seedProjects: Project[] = [
  { name: "App Saúde+", class: "2023.2", year: "2023", tech: ["React", "Node.js", "PostgreSQL"], status: "Concluído", description: "Aplicativo para gestão de saúde e agendamento de consultas." },
  { name: "EcoTrack", class: "2023.1", year: "2023", tech: ["Python", "AWS"], status: "Concluído", description: "Sistema de monitoramento ambiental com IoT e análise de dados." },
  { name: "Conecta+", class: "2022.2", year: "2022", tech: ["Flutter", "Firebase"], status: "Em andamento", description: "Plataforma de conexão entre estudantes e oportunidades." },
  { name: "Smart Campus", class: "2021.1", year: "2021", tech: ["React", "PostgreSQL"], status: "Disponível para continuar", description: "Sistema de gestão inteligente para campus universitário." },
  { name: "VidaFit", class: "2024.1", year: "2024", tech: ["React", "Node.js"], status: "Em andamento", description: "Experiência de bem-estar e hábitos saudáveis para estudantes." },
];

const PROJECTS_STORAGE_KEY = "acervo-projetos:projects";
const DRAFT_STORAGE_KEY = "acervo-projetos:draft";

function readSavedProjects(): Project[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(PROJECTS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((item: unknown): item is Project => {
      const project = item as Partial<Project> | null;
      return Boolean(project && typeof project.id === "string" && typeof project.name === "string" && typeof project.status === "string");
    });
  } catch {
    return [];
  }
}

function projectResources(project: Project) {
  return project.resources?.length ? project.resources : project.tech;
}

type ProjectDraft = {
  name: string;
  class: string;
  year: string;
  area: string;
  status: string;
  description: string;
  objective: string;
  results: string;
  team: string[];
  resources: string;
  attachments: string[];
};

function readProjectDraft(): ProjectDraft {
  const emptyDraft: ProjectDraft = {
    name: "", class: "", year: String(new Date().getFullYear()), area: "",
    status: "Em andamento", description: "", objective: "", results: "",
    team: [""], resources: "", attachments: [],
  };
  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    return stored ? { ...emptyDraft, ...JSON.parse(stored) } : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

const iconPaths: Record<string, ReactElement> = {
  search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
  layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  file: <><path d="M6 3h9l3 3v15H6z" /><path d="M9 10h6M9 14h6M9 18h4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 19c.5-4 2.5-6 6-6s5.5 2 6 6M16 5c2 .2 3 1.2 3 3s-1 2.8-3 3M17 14c2.5.6 3.5 2 4 5" /></>,
  spark: <><path d="m12 2 1.3 4.7L18 8l-4.7 1.3L12 14l-1.3-4.7L6 8l4.7-1.3L12 2Z" /><path d="m19 14 .6 2.4L22 17l-2.4.6L19 20l-.6-2.4L16 17l2.4-.6L19 14Z" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  chart: <><path d="M4 20V9M10 20V4M16 20v-7M22 20H2" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{iconPaths[name]}</svg>;
}

function Logo() {
  return <div className="logo">OI</div>;
}

function Header({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  return (
    <header>
      <button className="brand" onClick={() => go("home")}><Logo /><b>Acervo de Projetos</b></button>
      <nav>
        <button className={screen === "archive" || screen === "detail" ? "active" : ""} onClick={() => go("archive")}>Acervo</button>
        <button className={screen === "register" ? "active" : ""} onClick={() => go("register")}>Cadastrar</button>
        <button className={screen === "mine" ? "active" : ""} onClick={() => go("mine")}>Meus Projetos</button>
      </nav>
      <button className="primary small">Entrar</button>
    </header>
  );
}

function Footer() {
  return <footer><div className="brand"><Logo /><span>Acervo de Projetos</span></div><div>Sobre &nbsp;&nbsp;&nbsp; Contato &nbsp;&nbsp;&nbsp; Termos &nbsp;&nbsp;&nbsp; Privacidade</div><div>◉ &nbsp; ◧ &nbsp; in</div></footer>;
}

function Shell({ children, screen, go }: { children: ReactNode; screen: Screen; go: (s: Screen) => void }) {
  return <div className="app"><Header screen={screen} go={go} /><main>{children}</main><Footer /></div>;
}

function Picture({ large = false }: { large?: boolean }) {
  return <div className={`picture ${large ? "large" : ""}`}><div className="mountain" /><div className="sun" /></div>;
}

function Tags({ items }: { items: string[] }) {
  return <div className="tags">{items.map((item) => <span key={item}>{item}</span>)}</div>;
}

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <article className="project-card" onClick={onClick}>
      <Picture />
      <div className="card-copy">
        <div className="project-title"><b>{project.name}</b><span className="status-dot" /></div>
        <small>{[project.area, project.class && `Turma ${project.class}`, project.year].filter(Boolean).join(" · ") || "Projeto"}</small>
        <Tags items={projectResources(project)} />
        <p>{project.description}</p>
      </div>
      <button className="primary card-button">Ver projeto</button>
    </article>
  );
}

function Home({ projects, go, setSearch, selectProject }: { projects: Project[]; go: (s: Screen) => void; setSearch: (v: string) => void; selectProject: (p: Project) => void }) {
  const [query, setQuery] = useState("");
  const explore = () => { setSearch(query); go("archive"); };
  return (
    <div className="page home">
      <section className="hero">
        <div>
          <h1>Boas ideias<br />não desaparecem</h1>
          <p>Explore, aprenda e continue projetos que<br />já fizeram a diferença.</p>
          <form className="search-box" onSubmit={(e) => { e.preventDefault(); explore(); }}>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar projetos por nome, tema ou recurso..." />
            <button aria-label="Buscar"><Icon name="search" size={18} /></button>
          </form>
          <button className="primary explore" onClick={explore}>Explorar acervo <Icon name="arrow" size={17} /></button>
        </div>
        <Picture large />
      </section>
      <section className="feature-grid">
        {[
          ["file", "Ficha completa", "Informações detalhadas sobre cada projeto, incluindo equipe, objetivo, resultados e mais."],
          ["layers", "Recursos e métodos", "Materiais, ferramentas, técnicas e referências reunidos em um só lugar."],
          ["search", "Busca dinâmica", "Encontre projetos por tema, ano, recurso, grupo e status."],
        ].map(([icon, title, text]) => <article className="feature" key={title}><div className="icon-box"><Icon name={icon} /></div><h3>{title}</h3><p>{text}</p></article>)}
      </section>
      <section><h3 className="section-title">Projetos recentes em destaque</h3><div className="project-row">{projects.slice(0, 4).map((p) => <ProjectCard key={p.id ?? p.name} project={p} onClick={() => selectProject(p)} />)}</div></section>
    </div>
  );
}

function FilterGroup({ title, options, selected, onSelect }: { title: string; options: string[]; selected: string; onSelect: (v: string) => void }) {
  return <div className="filter-group"><b>{title}</b>{options.map((o) => <label key={o}><input type="radio" checked={selected === o} onChange={() => onSelect(o)} /> <span>{o}</span></label>)}</div>;
}

function Archive({ projects, go, query, setQuery, selectProject }: { projects: Project[]; go: (s: Screen) => void; query: string; setQuery: (v: string) => void; selectProject: (p: Project) => void }) {
  const [classFilter, setClassFilter] = useState("Todas");
  const [year, setYear] = useState("Todos");
  const [tech, setTech] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [sort, setSort] = useState("Mais recentes");
  const classOptions = ["Todas", ...new Set(projects.map((project) => project.class).filter(Boolean))];
  const yearOptions = ["Todos", ...new Set(projects.map((project) => project.year).filter(Boolean))];
  const resourceOptions = ["Todas", ...new Set(projects.flatMap(projectResources))];
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return projects.filter((p) =>
      (!q || `${p.name} ${p.area ?? ""} ${projectResources(p).join(" ")} ${p.class} ${p.description} ${p.objective ?? ""}`.toLowerCase().includes(q)) &&
      (classFilter === "Todas" || p.class === classFilter) &&
      (year === "Todos" || p.year === year) &&
      (tech === "Todas" || projectResources(p).includes(tech)) &&
      (status === "Todos" || p.status === status)
    ).sort((a, b) => sort === "A–Z" ? a.name.localeCompare(b.name) : sort === "Mais antigos" ? a.year.localeCompare(b.year) : b.year.localeCompare(a.year));
  }, [projects, query, classFilter, year, tech, status, sort]);
  const open = (p: Project) => { selectProject(p); go("detail"); };
  return (
    <div className="page archive">
      <div className="wide-search"><Icon name="search" size={17} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, tema, recurso ou grupo..." /><button><Icon name="search" size={18} /></button></div>
      <div className="archive-layout">
        <aside className="filters"><h3>Filtros</h3><FilterGroup title="Turma / grupo" options={classOptions} selected={classFilter} onSelect={setClassFilter} /><FilterGroup title="Ano" options={yearOptions} selected={year} onSelect={setYear} /><FilterGroup title="Recursos" options={resourceOptions} selected={tech} onSelect={setTech} /><FilterGroup title="Status" options={["Todos", ...new Set(projects.map((project) => project.status))]} selected={status} onSelect={setStatus} /></aside>
        <section className="results">
          <div className="result-head"><b>{filtered.length} resultados encontrados</b><label>Ordenar por: <select value={sort} onChange={(e) => setSort(e.target.value)}><option>Mais recentes</option><option>Mais antigos</option><option>A–Z</option></select></label></div>
          {filtered.length ? <div className="cards-grid">{filtered.map((p) => <ProjectCard key={p.id ?? p.name} project={p} onClick={() => open(p)} />)}</div> : <div className="empty"><Icon name="search" size={32} /><h3>Nenhum projeto encontrado</h3><p>Tente ajustar sua busca ou os filtros selecionados.</p><button className="secondary" onClick={() => { setQuery(""); setClassFilter("Todas"); setYear("Todos"); setTech("Todas"); setStatus("Todos"); }}>Limpar filtros</button></div>}
          <div className="pagination"><button>‹</button><button className="selected">1</button><button>2</button><button>3</button><button>4</button><button>›</button></div>
        </section>
      </div>
    </div>
  );
}

function ProjectHero({ project, openAI, assume }: { project: Project; openAI: () => void; assume: () => void }) {
  return <div className="project-hero"><Picture /><div className="project-hero-copy"><div><h2>{project.name}</h2><small>{project.area || (project.class ? `Turma ${project.class}` : "Área não informada")} · {project.year}</small><Tags items={projectResources(project)} /></div><span className="pill">{project.status}</span></div><div className="hero-actions"><button className="primary" onClick={assume}>Assumir projeto</button><button className="secondary" onClick={openAI}><Icon name="spark" size={16} /> Sugestões IA</button></div></div>;
}

function Detail({ project, projects, go, openAI, selectProject }: { project: Project; projects: Project[]; go: (s: Screen) => void; openAI: () => void; selectProject: (p: Project) => void }) {
  const [tab, setTab] = useState("Ficha");
  return <div className="page detail">
    <div className="breadcrumb">Acervo <span>›</span> {project.name}</div>
    <ProjectHero project={project} openAI={openAI} assume={() => go("continuity")} />
    <div className="tabs">{["Ficha", "Materiais e métodos", "Histórico de versões"].map((t) => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    <div className="detail-layout">
      <section>
        {tab === "Ficha" && <><div className="panel"><h3>Sobre o projeto</h3><div className="summary-grid"><Info icon="users" title="Participantes" text={project.team?.length ? `${project.team.length} participante(s)` : "Não informado"} /><Info icon="target" title="Objetivo" text={project.objective || project.description} /><Info icon="chart" title="Resultados" text={project.results || "Ainda não informados."} /></div></div><Team members={project.team ?? []} /></>}
        {tab === "Materiais e métodos" && <div className="panel tab-content"><h3>Recursos, materiais e métodos</h3>{projectResources(project).length ? <Tags items={projectResources(project)} /> : <p>Nenhum recurso ou material informado.</p>}<p>{project.description}</p>{project.plan && <><h4>Plano de continuidade</h4><p>{project.plan}</p></>}{project.attachments?.length ? <><h4>Anexos registrados</h4>{project.attachments.map((attachment) => <p key={attachment}>{attachment}</p>)}</> : null}</div>}
        {tab === "Histórico de versões" && <div className="panel tab-content"><h3>Histórico de versões</h3>{project.versionOf ? <div className="history"><i /><div><b>Nova versão criada</b><p>{projects.find((item) => item.id === project.versionOf)?.name ?? "Projeto original"}</p></div></div> : <p>Nenhuma versão anterior registrada.</p>}</div>}
      </section>
      <aside><div className="panel about"><h3>Sobre o projeto</h3><small>Área / tema</small><b>{project.area || "Não informado"}</b><small>Turma / grupo</small><b>{project.class || "Não informado"}</b><small>Ano</small><b>{project.year}</b><small>Status</small><span className="pill">{project.status}</span></div><div className="panel related"><h3>Projetos relacionados</h3>{projects.filter((p) => p.id !== project.id && p.name !== project.name).slice(0, 3).map((p) => <button key={p.id ?? p.name} onClick={() => selectProject(p)}><Picture /><span><b>{p.name}</b><small>{p.area || p.class || p.year}</small></span><Icon name="chevron" size={15} /></button>)}</div></aside>
    </div>
  </div>;
}

function Info({ icon, title, text }: { icon: string; title: string; text: string }) {
  return <div className="info"><Icon name={icon} /><div><small>{title}</small><p>{text}</p></div></div>;
}

function Team({ members }: { members: string[] }) {
  return <div className="panel team"><h3>Participantes</h3>{members.length ? members.map((name) => <div className="person" key={name}><div className="avatar">{name[0]}</div><div><b>{name}</b></div></div>) : <p className="muted">Nenhum participante informado.</p>}</div>;
}

function Steps({ labels, current }: { labels: string[]; current: number }) {
  return <div className="steps">{labels.map((label, i) => <div className={`${i <= current ? "done" : ""} ${i === current ? "current" : ""}`} key={label}><span>{i < current ? <Icon name="check" size={14} /> : i + 1}</span><b>{label}</b></div>)}</div>;
}

function Continuity({ project, initialPlan, onSuccess }: { project: Project; initialPlan: string; onSuccess: (project: Project) => void }) {
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState(project.team?.length ? [...project.team] : [""]);
  const [form, setForm] = useState({ class: "", objective: initialPlan, plan: initialPlan, dueDate: "" });
  const valid = step === 0 ? !!form.objective.trim() : step === 2 ? !!form.plan.trim() : true;
  const saveVersion = () => onSuccess({
    id: crypto.randomUUID(), name: `${project.name} (nova versão)`, class: form.class,
    year: String(new Date().getFullYear()), tech: project.tech, resources: projectResources(project),
    area: project.area, status: "Em andamento", description: form.objective,
    objective: form.objective, team: team.map((member) => member.trim()).filter(Boolean),
    plan: form.plan, dueDate: form.dueDate, versionOf: project.id,
    mineStatus: "Em desenvolvimento",
  });
  return <div className="page wizard-page"><h2>Continuar projeto</h2><Steps labels={["Projeto", "Equipe", "Plano"]} current={step} /><div className="wizard-layout"><section className="panel wizard-card">
    {step === 0 && <><h3>Informações da nova versão</h3><Field label="Turma, grupo ou unidade"><input value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} placeholder="Opcional" /></Field><Field label="Objetivo da nova versão *"><textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Descreva as entregas e os objetivos desta etapa..." /></Field></>}
    {step === 1 && <><h3>Participantes</h3><p className="muted">Informe quem participa desta etapa. Este campo é opcional.</p>{team.map((member, i) => <div className="member-input" key={i}><input value={member} onChange={(e) => setTeam(team.map((m, j) => j === i ? e.target.value : m))} placeholder="Nome do participante" />{i > 0 && <button onClick={() => setTeam(team.filter((_, j) => i !== j))}>×</button>}</div>)}<button className="secondary" onClick={() => setTeam([...team, ""])}>+ Adicionar participante</button></>}
    {step === 2 && <><h3>Plano de continuidade</h3><Field label="Descrição do plano *"><textarea value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Liste ações, etapas e próximos passos..." /></Field><Field label="Previsão de conclusão"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field></>}
    <div className="wizard-actions"><button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Voltar</button>{step < 2 ? <button className="primary" disabled={!valid} onClick={() => setStep(step + 1)}>Próximo <Icon name="arrow" size={16} /></button> : <button className="primary" disabled={!valid} onClick={saveVersion}>Criar nova versão</button>}</div>
  </section><Original project={project} /></div></div>;
}

function Original({ project }: { project: Project }) {
  return <aside className="panel original"><h3>Projeto original</h3><div className="original-head"><Picture /><div><b>{project.name}</b><small>{project.area || project.class || project.year}</small><span className="pill">{project.status}</span></div></div><h4>Recursos e materiais</h4><Tags items={projectResources(project)} /><h4>Resumo</h4><p>{project.description}</p><h4>Participantes</h4><Info icon="users" title="" text={`${project.team?.length ?? 0} informado(s)`} /></aside>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><b>{label}</b>{children}</label>;
}

function Register({ onSuccess }: { onSuccess: (project: Project) => void }) {
  const [step, setStep] = useState(0);
  const labels = ["Dados gerais", "Participantes", "Objetivos/resultados", "Recursos e métodos", "Anexos"];
  const [form, setForm] = useState<ProjectDraft>(readProjectDraft);
  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      return;
    }
  }, [form]);
  const update = <K extends keyof ProjectDraft,>(key: K, value: ProjectDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const valid = step !== 0 || Boolean(form.name.trim() && form.area.trim() && form.description.trim());
  const saveProject = () => {
    const project: Project = {
      id: crypto.randomUUID(), name: form.name.trim(), class: form.class.trim(), year: form.year.trim(),
      area: form.area.trim(), status: form.status, description: form.description.trim(),
      objective: form.objective.trim(), results: form.results.trim(),
      team: form.team.map((member) => member.trim()).filter(Boolean),
      resources: form.resources.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      tech: [], attachments: form.attachments, mineStatus: "Em desenvolvimento",
    };
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      return;
    }
    onSuccess(project);
  };
  return <div className="page register"><h2>Cadastro de novo projeto</h2><Steps labels={labels} current={step} /><div className="register-layout"><section className="panel wizard-card">
    {step === 0 && <><h3>Dados gerais</h3><Field label="Título do projeto *"><input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Ex.: Horta comunitária" /></Field><div className="two-cols"><Field label="Área ou tema *"><input value={form.area} onChange={(e) => update("area", e.target.value)} placeholder="Ex.: cultura, pesquisa, saúde, meio ambiente" /></Field><Field label="Ano"><input value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="Ex.: 2026" /></Field></div><div className="two-cols"><Field label="Turma, grupo ou unidade"><input value={form.class} onChange={(e) => update("class", e.target.value)} placeholder="Opcional" /></Field><Field label="Status"><select value={form.status} onChange={(e) => update("status", e.target.value)}><option>Em andamento</option><option>Planejamento</option><option>Concluído</option><option>Pausado</option></select></Field></div><Field label="Descrição *"><textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Conte sobre a iniciativa, seu contexto e o que foi realizado..." /></Field></>}
    {step === 1 && <GenericStep title="Participantes" text="Adicione pessoas responsáveis ou colaboradoras. Este campo é opcional.">{form.team.map((member, index) => <div className="member-input" key={index}><input value={member} onChange={(e) => update("team", form.team.map((item, i) => i === index ? e.target.value : item))} placeholder="Nome do participante" />{index > 0 && <button onClick={() => update("team", form.team.filter((_, i) => i !== index))}>×</button>}</div>)}<button className="secondary" onClick={() => update("team", [...form.team, ""])}>+ Adicionar participante</button></GenericStep>}
    {step === 2 && <GenericStep title="Objetivos e resultados" text="Registre o propósito e os resultados alcançados."><Field label="Objetivos"><textarea value={form.objective} onChange={(e) => update("objective", e.target.value)} placeholder="O que o projeto busca transformar, investigar ou realizar?" /></Field><Field label="Resultados e aprendizados"><textarea value={form.results} onChange={(e) => update("results", e.target.value)} placeholder="Descreva resultados, impactos e aprendizados..." /></Field></GenericStep>}
    {step === 3 && <GenericStep title="Recursos e métodos" text="Registre o que foi usado ou desenvolvido, seja material, técnica ou ferramenta."><Field label="Materiais, ferramentas, métodos e referências"><textarea value={form.resources} onChange={(e) => update("resources", e.target.value)} placeholder="Ex.: entrevistas, sementes, câmera, laboratório, oficina de escrita, Python... Separe os itens por vírgula ou linha." /></Field></GenericStep>}
    {step === 4 && <GenericStep title="Anexos" text="Registre documentos, imagens, apresentações ou outros arquivos relacionados."><label className="dropzone"><Icon name="upload" size={28} /><b>Selecionar arquivos</b><small>Os nomes ficam registrados neste navegador.</small><input type="file" multiple onChange={(e) => update("attachments", Array.from(e.currentTarget.files ?? []).map((file) => file.name))} /></label>{form.attachments.length > 0 && <p className="muted">{form.attachments.join(", ")}</p>}</GenericStep>}
    <div className="wizard-actions"><button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Voltar</button>{step < 4 ? <button className="primary" disabled={!valid} onClick={() => setStep(step + 1)}>Próximo <Icon name="arrow" size={16} /></button> : <button className="primary" onClick={saveProject}>Cadastrar projeto</button>}</div>
  </section><aside className="panel preview"><h3>Pré-visualização da ficha</h3><Picture /><small>{form.area || "Área ou tema"}</small><h2>{form.name || "Seu projeto"}</h2><span className="pill">{form.status}</span><h4>Resumo</h4><p>{form.description || "A descrição do projeto aparecerá aqui..."}</p><h4>Participantes</h4><Info icon="users" title="" text={`${form.team.filter(Boolean).length} informado(s)`} /></aside></div></div>;
}

function GenericStep({ title, text, children }: { title: string; text: string; children: ReactNode }) {
  return <><h3>{title}</h3><p className="muted">{text}</p>{children}</>;
}

function Mine({ projects, go, selectProject }: { projects: Project[]; go: (s: Screen) => void; selectProject: (p: Project) => void }) {
  const [filter, setFilter] = useState("Todos");
  const statuses = ["Todos", "Em desenvolvimento", "Assumidos", "Rascunhos", "Concluídos"];
  const mapped = projects.map((p, i) => ({ ...p, mineStatus: p.mineStatus ?? ["Concluídos", "Assumidos", "Em desenvolvimento", "Rascunhos", "Em desenvolvimento"][i % 5] }));
  const shown = filter === "Todos" ? mapped : mapped.filter((p) => p.mineStatus === filter);
  return <div className="page mine"><div className="page-heading"><div><h1>Meus projetos</h1><p>Acompanhe os projetos que você criou ou assumiu.</p></div><button className="primary" onClick={() => go("register")}>+ Cadastrar projeto</button></div><div className="status-tabs">{statuses.map((s) => <button className={filter === s ? "active" : ""} onClick={() => setFilter(s)} key={s}>{s}</button>)}</div><div className="cards-grid">{shown.map((p) => <div className="mine-card" key={p.id ?? p.name}><span className="pill">{p.mineStatus}</span><ProjectCard project={p} onClick={() => { selectProject(p); go("detail"); }} /></div>)}</div></div>;
}

type Suggestion = { id: number; title: string; text: string; added: boolean };
function AIPanel({ project, close, usePlan }: { project: Project; close: () => void; usePlan: (plan: string) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "ready">("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    { id: 1, title: "Ampliar alcance e participação", text: "Mapear novos públicos e parceiros que possam fortalecer a iniciativa.", added: false },
    { id: 2, title: "Registrar impacto e aprendizados", text: "Definir formas de acompanhar resultados e compartilhar o que foi aprendido.", added: false },
  ]);
  const analyze = () => { setState("loading"); window.setTimeout(() => setState("ready"), 1800); };
  const plan = suggestions.filter((s) => s.added).map((s) => s.title).join(", ");
  return <><div className="overlay" onClick={close} /><aside className="ai-panel"><button className="close" onClick={close}><Icon name="close" size={20} /></button><div className="ai-title"><div className="ai-brain"><Icon name="spark" /></div><div><h2>IA Assistente</h2><p>Analise e inove, não substitui o trabalho.</p></div></div><div className="ai-project"><Picture /><div><b>{project.name}</b><small>{project.area || project.class || project.year}</small><Tags items={projectResources(project).slice(0, 2)} /></div></div><button className="ai-analyze" disabled={state === "loading"} onClick={analyze}>{state === "loading" ? <><span className="spinner" /> Analisando...</> : state === "ready" ? "Analisar novamente" : "Analisar projeto"}</button>
    {state === "idle" && <div className="ai-placeholder"><Icon name="spark" size={30} /><h3>Descubra novas possibilidades</h3><p>A IA analisará a ficha e a stack para sugerir caminhos de inovação.</p></div>}
    {state === "loading" && <div className="skeletons"><i /><i /><i /><i /></div>}
    {state === "ready" && <div className="suggestions"><h3>Sugestões geradas pela IA</h3>{suggestions.map((s) => <article key={s.id}><div className="suggest-icon"><Icon name="spark" size={16} /></div><div><b>{s.title}</b><p>{s.text}</p><div><button className={s.added ? "added" : "primary"} onClick={() => setSuggestions(suggestions.map((x) => x.id === s.id ? { ...x, added: true } : x))}>{s.added ? <><Icon name="check" size={14} /> Adicionado</> : "Adicionar ao plano"}</button><button className="text-button" onClick={() => setSuggestions(suggestions.filter((x) => x.id !== s.id))}>Descartar</button></div></div></article>)}</div>}
    <div className="ai-chat"><input placeholder="Converse com a IA sobre o projeto..." /><button>➤</button><div><span>Ampliar impacto</span><span>Planejar avaliação</span></div></div><button className="use-plan" disabled={!plan} onClick={() => usePlan(plan)}>Usar no plano da Nova Versão</button>
  </aside></>;
}

function SuccessModal({ title, text, close }: { title: string; text: string; close: () => void }) {
  return <><div className="overlay top" /><div className="success-modal"><div className="success-check"><Icon name="check" size={28} /></div><h2>{title}</h2><p>{text}</p><button className="primary" onClick={close}>Concluir</button></div></>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");
  const [userProjects, setUserProjects] = useState<Project[]>(readSavedProjects);
  const [selected, setSelected] = useState(seedProjects[0]);
  const [aiOpen, setAiOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [success, setSuccess] = useState<null | "version" | "project">(null);
  const projects = [...userProjects, ...seedProjects];
  useEffect(() => {
    try {
      window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(userProjects));
    } catch {
      return;
    }
  }, [userProjects]);
  const go = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const selectProject = (p: Project) => { setSelected(p); setScreen("detail"); window.scrollTo(0, 0); };
  const saveProject = (project: Project) => {
    setUserProjects((current) => [project, ...current]);
    setSelected(project);
    setSuccess("project");
  };
  return <Shell screen={screen} go={go}>
    {screen === "home" && <Home projects={projects} go={go} setSearch={setQuery} selectProject={selectProject} />}
    {screen === "archive" && <Archive go={go} query={query} setQuery={setQuery} selectProject={selectProject} />}
    {screen === "detail" && <Detail project={selected} projects={projects} go={go} openAI={() => setAiOpen(true)} selectProject={selectProject} />}
    {screen === "continuity" && <Continuity project={selected} initialPlan={plan} onSuccess={saveProject} />}
    {screen === "register" && <Register onSuccess={saveProject} />}
    {screen === "mine" && <Mine projects={projects} go={go} selectProject={selectProject} />}
    {aiOpen && <AIPanel project={selected} close={() => setAiOpen(false)} usePlan={(value) => { setPlan(value); setAiOpen(false); go("continuity"); }} />}
    {success && <SuccessModal title={success === "version" ? "Nova versão criada com sucesso!" : "Projeto cadastrado com sucesso!"} text={success === "version" ? "O projeto já está disponível em Meus Projetos." : "A ficha do projeto foi criada e já pode ser acessada."} close={() => { setSuccess(null); go("mine"); }} />}
  </Shell>;
}
