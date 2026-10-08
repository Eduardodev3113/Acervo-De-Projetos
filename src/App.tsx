import { useEffect, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { ATTACHMENTS_BUCKET, supabase } from "./supabase";

type Screen = "home" | "archive" | "detail" | "continuity" | "register" | "mine";
type ProjectAttachment = { name: string; path?: string };
type Project = {
  id?: string;
  ownerId?: string;
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
  attachments?: ProjectAttachment[];
  mineStatus?: string;
  versionOf?: string;
  plan?: string;
  dueDate?: string;
};

const seedProjects: Project[] = [
  { id: "seed-saude", name: "App Saúde+", class: "2023.2", year: "2023", tech: ["React", "Node.js", "PostgreSQL"], status: "Concluído", description: "Aplicativo para gestão de saúde e agendamento de consultas." },
  { id: "seed-ecotrack", name: "EcoTrack", class: "2023.1", year: "2023", tech: ["Python", "AWS"], status: "Concluído", description: "Sistema de monitoramento ambiental com IoT e análise de dados." },
  { id: "seed-conecta", name: "Conecta+", class: "2022.2", year: "2022", tech: ["Flutter", "Firebase"], status: "Em andamento", description: "Plataforma de conexão entre estudantes e oportunidades." },
  { id: "seed-campus", name: "Smart Campus", class: "2021.1", year: "2021", tech: ["React", "PostgreSQL"], status: "Disponível para continuar", description: "Sistema de gestão inteligente para campus universitário." },
  { id: "seed-vidafit", name: "VidaFit", class: "2024.1", year: "2024", tech: ["React", "Node.js"], status: "Em andamento", description: "Experiência de bem-estar e hábitos saudáveis para estudantes." },
];

const LEGACY_PROJECTS_STORAGE_KEY = "acervo-projetos:projects";
const DRAFT_STORAGE_KEY = "acervo-projetos:draft";
const CONTINUITY_DRAFT_STORAGE_KEY = "acervo-projetos:continuity:";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IFSC_EMAIL_DOMAINS = ["ifsc.edu.br", "aluno.ifsc.edu.br"];

function isIfscEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  return IFSC_EMAIL_DOMAINS.some((domain) => normalizedEmail.endsWith(`@${domain}`));
}

function readSavedProjects(): Project[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(LEGACY_PROJECTS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((item: unknown): item is Project => {
      const project = item as Partial<Project> | null;
      return Boolean(project && typeof project.id === "string" && typeof project.name === "string" && typeof project.class === "string" && typeof project.year === "string" && Array.isArray(project.tech) && typeof project.status === "string");
    });
  } catch {
    return [];
  }
}

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  project_class: string;
  year: string;
  tech: string[];
  resources: string[];
  area: string;
  status: string;
  description: string;
  objective: string;
  results: string;
  team: string[];
  attachments: unknown;
  mine_status: string;
  version_of: string | null;
  plan: string;
  due_date: string | null;
};

function normalizeAttachments(value: unknown): ProjectAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ProjectAttachment[] => {
    if (typeof item === "string") return [{ name: item }];
    if (!item || typeof item !== "object") return [];
    const attachment = item as Partial<ProjectAttachment>;
    return typeof attachment.name === "string"
      ? [{ name: attachment.name, path: typeof attachment.path === "string" ? attachment.path : undefined }]
      : [];
  });
}

function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    class: row.project_class,
    year: row.year,
    tech: row.tech ?? [],
    resources: row.resources ?? [],
    area: row.area,
    status: row.status,
    description: row.description,
    objective: row.objective,
    results: row.results,
    team: row.team ?? [],
    attachments: normalizeAttachments(row.attachments),
    mineStatus: row.mine_status,
    versionOf: row.version_of ?? undefined,
    plan: row.plan,
    dueDate: row.due_date ?? undefined,
  };
}

function projectToRow(project: Project, ownerId: string) {
  return {
    id: project.id,
    owner_id: ownerId,
    name: project.name,
    project_class: project.class,
    year: project.year,
    tech: project.tech,
    resources: project.resources ?? [],
    area: project.area ?? "",
    status: project.status,
    description: project.description,
    objective: project.objective ?? "",
    results: project.results ?? "",
    team: project.team ?? [],
    attachments: normalizeAttachments(project.attachments),
    mine_status: project.mineStatus ?? "Em desenvolvimento",
    version_of: project.versionOf && UUID_PATTERN.test(project.versionOf) ? project.versionOf : null,
    plan: project.plan ?? "",
    due_date: project.dueDate || null,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function projectResources(project: Project) {
  return project.resources?.length ? project.resources : project.tech;
}

function attachmentUrl(path?: string) {
  return path && supabase ? supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(path).data.publicUrl : undefined;
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

function Header({ screen, go, user, onOpenAuth, onSignOut, theme, toggleTheme }: { screen: Screen; go: (s: Screen) => void; user: User | null; onOpenAuth: () => void; onSignOut: () => void; theme: "light" | "dark"; toggleTheme: () => void }) {
  return (
    <header>
      <button className="brand" onClick={() => go("home")}><Logo /><b>Acervo de Projetos</b></button>
      <nav>
        <button className={screen === "archive" || screen === "detail" ? "active" : ""} onClick={() => go("archive")}>Acervo</button>
        <button className={screen === "register" ? "active" : ""} onClick={() => go("register")}>Cadastrar</button>
        <button className={screen === "mine" ? "active" : ""} onClick={() => go("mine")}>Meus Projetos</button>
      </nav>
      <div className="header-actions"><button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"} aria-pressed={theme === "dark"} title={theme === "light" ? "Modo escuro" : "Modo claro"}>{theme === "light" ? "☾" : "☀"}</button><button className="primary small" title={user?.email ?? "Entrar"} onClick={user ? onSignOut : onOpenAuth}>{user ? "Sair" : "Entrar"}</button></div>
    </header>
  );
}

type FooterPanel = "about" | "contact" | "terms" | "privacy";

function Footer({ openPanel }: { openPanel: (panel: FooterPanel) => void }) {
  return <footer><div className="brand"><Logo /><span>Acervo de Projetos</span></div><nav aria-label="Informações do projeto" className="footer-links"><button onClick={() => openPanel("about")}>Sobre</button><button onClick={() => openPanel("contact")}>Contato</button><button onClick={() => openPanel("terms")}>Termos</button><button onClick={() => openPanel("privacy")}>Privacidade</button></nav></footer>;
}

function SocialIcon({ platform }: { platform: "github" | "instagram" | "linkedin" }) {
  if (platform === "linkedin") return <span className="social-icon linkedin-mark" aria-hidden>in</span>;
  return <svg className={`social-icon ${platform}-mark`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {platform === "instagram" ? <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></> : <><path d="M8 19c-4 1-4-2-5-2m10 4v-4c0-1 .2-2 1-3-3 0-6-1-6-5 0-1 .4-2 1-3-.1-1 .1-2 1-3 0 0 2 0 3 1a10 10 0 016 0c1-1 3-1 3-1 1 1 1 2 1 3 .6 1 1 2 1 3 0 4-3 5-6 5 1 1 1 2 1 3v4" /></>}
  </svg>;
}

function FooterDialog({ panel, close }: { panel: FooterPanel; close: () => void }) {
  const titles: Record<FooterPanel, string> = { about: "Sobre o projeto", contact: "Contato", terms: "Termos de uso", privacy: "Privacidade" };
  return <><div className="overlay top" onClick={close} /><section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="footer-dialog-title"><button className="close" onClick={close} aria-label="Fechar">×</button><h2 id="footer-dialog-title">{titles[panel]}</h2>
    {panel === "about" && <><p>Um acervo acadêmico para registrar, compartilhar e dar continuidade a projetos desenvolvidos no IFSC.</p><h3>Tecnologias</h3><p>React, TypeScript, Vite, Tailwind CSS e Supabase (autenticação, banco de dados e armazenamento de anexos).</p><h3>Criadores</h3><div className="creator"><b>Eduardo Festugatto Dall Rosa</b><a href="mailto:eduardo.r2008@aluno.ifsc.edu.br">eduardo.r2008@aluno.ifsc.edu.br</a></div><div className="creator"><b>Vinícius Augusto Madela Fornazier</b><a href="mailto:vinicius.amf20@aluno.ifsc.edu.br">vinicius.amf20@aluno.ifsc.edu.br</a></div><h3>Links</h3><div className="social-links"><a href="https://github.com/Eduardodev3113/Acervo-De-Projetos" target="_blank" rel="noreferrer"><SocialIcon platform="github" />Repositório do projeto</a><a href="https://github.com/Eduardodev3113" target="_blank" rel="noreferrer"><SocialIcon platform="github" />@Eduardodev3113</a><a href="https://github.com/TheBigGuri" target="_blank" rel="noreferrer"><SocialIcon platform="github" />@TheBigGuri</a><a href="https://www.instagram.com/fdr.eduardo/" target="_blank" rel="noreferrer"><SocialIcon platform="instagram" />@fdr.eduardo</a><a href="https://www.instagram.com/vinimadela/" target="_blank" rel="noreferrer"><SocialIcon platform="instagram" />@vinimadela</a><a href="https://www.linkedin.com/in/eduardo-festugatto-dall-rosa-9126753b2/" target="_blank" rel="noreferrer"><SocialIcon platform="linkedin" />@eduardo-festugatto-dall-rosa</a><a href="https://www.linkedin.com/in/vinicius-augusto-madela-fornazier-59b4a2383/" target="_blank" rel="noreferrer"><SocialIcon platform="linkedin" />@vinicius-augusto-madela-fornazier</a></div></>}
    {panel === "contact" && <><p>Fale com os criadores do acervo:</p><div className="contact-list"><a href="mailto:eduardo.r2008@aluno.ifsc.edu.br">Eduardo Festugatto Dall Rosa · eduardo.r2008@aluno.ifsc.edu.br</a><a href="mailto:vinicius.amf20@aluno.ifsc.edu.br">Vinícius Augusto Madela Fornazier · vinicius.amf20@aluno.ifsc.edu.br</a></div></>}
    {panel === "terms" && <><p>O acervo é destinado ao registro e compartilhamento de projetos acadêmicos. Ao publicar, você declara que tem autorização para enviar os textos, imagens, documentos e demais materiais incluídos.</p><p>Não publique conteúdo ilegal, protegido sem autorização ou dados pessoais e sensíveis sem consentimento. Projetos e anexos enviados ficam acessíveis publicamente no acervo.</p><p>Os criadores podem remover conteúdo inadequado. Para dúvidas ou solicitações, entre em contato pelos emails informados na seção Contato.</p></>}
    {panel === "privacy" && <><p>O login usa seu email institucional. Os projetos e anexos enviados são armazenados no Supabase e ficam públicos para leitura e download. Evite incluir informações confidenciais ou dados pessoais de terceiros sem autorização.</p><p>Ao pedir sugestões de IA, o nome, a descrição, os objetivos, os resultados e os recursos do projeto são enviados ao provedor de IA configurado pela equipe para gerar a resposta. Não inclua dados pessoais ou confidenciais nesses campos.</p><p>Rascunhos do formulário são salvos no armazenamento local deste navegador. O Supabase também mantém os dados necessários à autenticação e ao vínculo entre a conta e os projetos.</p><p>Para solicitar correção ou remoção de conteúdo, entre em contato com os criadores pelos emails da seção Contato.</p></>}
    <button className="primary" onClick={close}>Fechar</button>
  </section></>;
}

function Shell({ children, screen, go, user, onOpenAuth, onSignOut, notice, dismissNotice, theme, toggleTheme }: { children: ReactNode; screen: Screen; go: (s: Screen) => void; user: User | null; onOpenAuth: () => void; onSignOut: () => void; notice: string; dismissNotice: () => void; theme: "light" | "dark"; toggleTheme: () => void }) {
  const [footerPanel, setFooterPanel] = useState<FooterPanel | null>(null);
  return <div className="app"><Header screen={screen} go={go} user={user} onOpenAuth={onOpenAuth} onSignOut={onSignOut} theme={theme} toggleTheme={toggleTheme} /><main>{notice && <div className="notice" role="status">{notice}<button onClick={dismissNotice} aria-label="Fechar aviso">×</button></div>}{children}</main><Footer openPanel={setFooterPanel} />{footerPanel && <FooterDialog panel={footerPanel} close={() => setFooterPanel(null)} />}</div>;
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
      <button className="primary card-button" type="button" onClick={(event) => { event.stopPropagation(); onClick(); }}>Ver projeto</button>
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

function ProjectHero({ project, openAI, assume, claiming }: { project: Project; openAI: () => void; assume: () => void; claiming: boolean }) {
  const claimable = Boolean(project.id && UUID_PATTERN.test(project.id) && project.status !== "Em andamento");
  const claimTitle = !project.id || !UUID_PATTERN.test(project.id)
    ? "Somente projetos publicados no acervo podem ser assumidos."
    : project.status === "Em andamento"
      ? "Este projeto já está em andamento."
      : "Assumir projeto";
  return <div className="project-hero"><Picture /><div className="project-hero-copy"><div><h2>{project.name}</h2><small>{project.area || (project.class ? `Turma ${project.class}` : "Área não informada")} · {project.year}</small><Tags items={projectResources(project)} /></div><span className="pill">{project.status}</span></div><div className="hero-actions"><button className="primary" disabled={!claimable || claiming} title={claimTitle} onClick={assume}>{claiming ? "Verificando..." : "Assumir projeto"}</button><button className="secondary" onClick={openAI}><Icon name="spark" size={16} /> Sugestões IA</button></div></div>;
}

function Detail({ project, projects, openAI, onAssume, claiming, selectProject }: { project: Project; projects: Project[]; openAI: () => void; onAssume: () => void; claiming: boolean; selectProject: (p: Project) => void }) {
  const [tab, setTab] = useState("Ficha");
  return <div className="page detail">
    <div className="breadcrumb">Acervo <span>›</span> {project.name}</div>
    <ProjectHero project={project} openAI={openAI} assume={onAssume} claiming={claiming} />
    <div className="tabs">{["Ficha", "Materiais e métodos", "Histórico de versões"].map((t) => <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    <div className="detail-layout">
      <section>
        {tab === "Ficha" && <><div className="panel"><h3>Sobre o projeto</h3><div className="summary-grid"><Info icon="users" title="Participantes" text={project.team?.length ? `${project.team.length} participante(s)` : "Não informado"} /><Info icon="target" title="Objetivo" text={project.objective || project.description} /><Info icon="chart" title="Resultados" text={project.results || "Ainda não informados."} /></div></div><Team members={project.team ?? []} /></>}
        {tab === "Materiais e métodos" && <div className="panel tab-content"><h3>Recursos, materiais e métodos</h3>{projectResources(project).length ? <Tags items={projectResources(project)} /> : <p>Nenhum recurso ou material informado.</p>}<p>{project.description}</p>{project.plan && <><h4>Plano de continuidade</h4><p>{project.plan}</p></>}{project.attachments?.length ? <><h4>Anexos</h4>{project.attachments.map((attachment) => { const href = attachmentUrl(attachment.path); return <p key={attachment.path ?? attachment.name}>{href ? <a href={href} target="_blank" rel="noreferrer">{attachment.name}</a> : attachment.name}</p>; })}</> : null}</div>}
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

function Continuity({ project, initialPlan, onSuccess, onCancel }: { project: Project; initialPlan: string; onSuccess: (project: Project) => Promise<void>; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [claimValid, setClaimValid] = useState(true);
  const draftKey = `${CONTINUITY_DRAFT_STORAGE_KEY}${project.id ?? project.name}`;
  const [draft] = useState(() => {
    const initial = { team: project.team?.length ? [...project.team] : [""], form: { class: "", objective: initialPlan, plan: initialPlan, dueDate: "" } };
    try {
      const stored = window.localStorage.getItem(draftKey);
      return stored ? { ...initial, ...JSON.parse(stored) } : initial;
    } catch {
      return initial;
    }
  });
  const [team, setTeam] = useState<string[]>(draft.team);
  const [form, setForm] = useState(draft.form);
  useEffect(() => {
    if (!supabase || !project.id || !UUID_PATTERN.test(project.id)) return;
    let active = true;
    const interval = window.setInterval(() => {
      void supabase.rpc("renew_project_claim", { target_project_id: project.id }).then(({ error }) => {
        if (active && error) {
          setClaimValid(false);
          setSaveError("A reserva deste projeto expirou. Volte ao acervo e tente assumir novamente.");
        }
      });
    }, 4 * 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, [project.id]);
  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey, JSON.stringify({ team, form }));
    } catch {
      return;
    }
  }, [draftKey, team, form]);
  const valid = step === 0 ? !!form.objective.trim() : step === 2 ? !!form.plan.trim() : true;
  const saveVersion = () => onSuccess({
    id: crypto.randomUUID(), name: `${project.name} (nova versão)`, class: form.class,
    year: String(new Date().getFullYear()), tech: project.tech, resources: projectResources(project),
    area: project.area, status: "Em andamento", description: form.objective,
    objective: form.objective, team: team.map((member) => member.trim()).filter(Boolean),
    plan: form.plan, dueDate: form.dueDate, versionOf: project.id,
    mineStatus: "Em desenvolvimento",
  });
  const finishVersion = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await saveVersion();
      window.localStorage.removeItem(draftKey);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };
  return <div className="page wizard-page"><h2>Continuar projeto</h2><Steps labels={["Projeto", "Equipe", "Plano"]} current={step} /><div className="wizard-layout"><section className="panel wizard-card">
    {step === 0 && <><h3>Informações da nova versão</h3><Field label="Turma, grupo ou unidade"><input value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} placeholder="Opcional" /></Field><Field label="Objetivo da nova versão *"><textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="Descreva as entregas e os objetivos desta etapa..." /></Field></>}
    {step === 1 && <><h3>Participantes</h3><p className="muted">Informe quem participa desta etapa. Este campo é opcional.</p>{team.map((member, i) => <div className="member-input" key={i}><input value={member} onChange={(e) => setTeam(team.map((m, j) => j === i ? e.target.value : m))} placeholder="Nome do participante" />{i > 0 && <button onClick={() => setTeam(team.filter((_, j) => i !== j))}>×</button>}</div>)}<button className="secondary" onClick={() => setTeam([...team, ""])}>+ Adicionar participante</button></>}
    {step === 2 && <><h3>Plano de continuidade</h3><Field label="Descrição do plano *"><textarea value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} placeholder="Liste ações, etapas e próximos passos..." /></Field><Field label="Previsão de conclusão"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field></>}
    {saveError && <p className="form-error" role="alert">{saveError}</p>}<div className="wizard-actions"><button className="secondary" disabled={saving} onClick={() => step === 0 ? onCancel() : setStep(step - 1)}>{step === 0 ? "Cancelar" : "Voltar"}</button>{step < 2 ? <button className="primary" disabled={!valid || saving || !claimValid} onClick={() => setStep(step + 1)}>Próximo <Icon name="arrow" size={16} /></button> : <button className="primary" disabled={!valid || saving || !claimValid} onClick={finishVersion}>{saving ? "Salvando..." : "Criar nova versão"}</button>}</div>
  </section><Original project={project} /></div></div>;
}

function Original({ project }: { project: Project }) {
  return <aside className="panel original"><h3>Projeto original</h3><div className="original-head"><Picture /><div><b>{project.name}</b><small>{project.area || project.class || project.year}</small><span className="pill">{project.status}</span></div></div><h4>Recursos e materiais</h4><Tags items={projectResources(project)} /><h4>Resumo</h4><p>{project.description}</p><h4>Participantes</h4><Info icon="users" title="" text={`${project.team?.length ?? 0} informado(s)`} /></aside>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><b>{label}</b>{children}</label>;
}

function Register({ onSuccess }: { onSuccess: (project: Project, files: File[]) => Promise<void> }) {
  const [step, setStep] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
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
  const saveProject = async () => {
    setSaving(true);
    setSaveError("");
    const project: Project = {
      id: crypto.randomUUID(), name: form.name.trim(), class: form.class.trim(), year: form.year.trim(),
      area: form.area.trim(), status: form.status, description: form.description.trim(),
      objective: form.objective.trim(), results: form.results.trim(),
      team: form.team.map((member) => member.trim()).filter(Boolean),
      resources: form.resources.split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      tech: [], attachments: [], mineStatus: "Em desenvolvimento",
    };
    try {
      await onSuccess(project, selectedFiles);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
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
  const shown = filter === "Todos" ? projects : projects.filter((p) => p.mineStatus === filter);
  return <div className="page mine"><div className="page-heading"><div><h1>Meus projetos</h1><p>Acompanhe os projetos que você criou ou assumiu.</p></div><button className="primary" onClick={() => go("register")}>+ Cadastrar projeto</button></div><div className="status-tabs">{statuses.map((s) => <button className={filter === s ? "active" : ""} onClick={() => setFilter(s)} key={s}>{s}</button>)}</div><div className="cards-grid">{shown.map((p) => <div className="mine-card" key={p.id ?? p.name}><span className="pill">{p.mineStatus}</span><ProjectCard project={p} onClick={() => { selectProject(p); go("detail"); }} /></div>)}</div></div>;
}

type Suggestion = { id: number; title: string; text: string; added: boolean };
function AIPanel({ project, close, usePlan }: { project: Project; close: () => void; usePlan: (plan: string) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [requestError, setRequestError] = useState("");
  const analyze = async () => {
    setState("loading");
    setRequestError("");
    setSuggestions([]);
    try {
      const response = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: {
            name: project.name,
            area: project.area,
            description: project.description,
            objective: project.objective,
            results: project.results,
            resources: projectResources(project),
          },
        }),
      });
      const result = await response.json() as { error?: string; suggestions?: Array<{ title: string; text: string }> };
      if (!response.ok) throw new Error(result.error || "A API de IA não conseguiu analisar este projeto.");
      if (!Array.isArray(result.suggestions) || result.suggestions.length < 2) throw new Error("A API de IA não retornou sugestões válidas.");
      setSuggestions(result.suggestions.map((suggestion, index) => ({ ...suggestion, id: index + 1, added: false })));
      setState("ready");
    } catch (error) {
      setRequestError(errorMessage(error));
      setState("error");
    }
  };
  const plan = suggestions.filter((suggestion) => suggestion.added).map((suggestion) => `${suggestion.title}: ${suggestion.text}`).join("\n");
  return <><div className="overlay" onClick={close} /><aside className="ai-panel"><button className="close" onClick={close} aria-label="Fechar assistente"><Icon name="close" size={20} /></button><div className="ai-title"><div className="ai-brain"><Icon name="spark" /></div><div><h2>IA Assistente</h2><p>Sugestões geradas a partir dos dados deste projeto.</p></div></div><div className="ai-project"><Picture /><div><b>{project.name}</b><small>{project.area || project.class || project.year}</small><Tags items={projectResources(project).slice(0, 2)} /></div></div><button className="ai-analyze" disabled={state === "loading"} onClick={analyze}>{state === "loading" ? <><span className="spinner" /> Consultando modelo...</> : state === "ready" || state === "error" ? "Analisar novamente" : "Analisar projeto"}</button>
    {state === "idle" && <div className="ai-placeholder"><Icon name="spark" size={30} /><h3>Analise este projeto</h3><p>O modelo vai gerar sugestões específicas usando os objetivos, resultados e recursos informados.</p></div>}
    {state === "loading" && <div className="skeletons"><i /><i /><i /><i /></div>}
    {state === "error" && <p className="form-error" role="alert">{requestError}</p>}
    {state === "ready" && <div className="suggestions"><h3>Sugestões geradas pelo modelo</h3>{suggestions.map((suggestion) => <article key={suggestion.id}><div className="suggest-icon"><Icon name="spark" size={16} /></div><div><b>{suggestion.title}</b><p>{suggestion.text}</p><div><button className={suggestion.added ? "added" : "primary"} onClick={() => setSuggestions((current) => current.map((item) => item.id === suggestion.id ? { ...item, added: !item.added } : item))}>{suggestion.added ? <><Icon name="check" size={14} /> Adicionado</> : "Adicionar ao plano"}</button><button className="text-button" onClick={() => setSuggestions((current) => current.filter((item) => item.id !== suggestion.id))}>Descartar</button></div></div></article>)}</div>}
    <button className="use-plan" disabled={!plan} onClick={() => usePlan(plan)}>Usar no plano da Nova Versão</button>
  </aside></>;
}

function AuthModal({ close, onAuthenticated }: { close: () => void; onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "signup" && !isIfscEmail(normalizedEmail)) {
      setMessage("Use seu e-mail institucional do IFSC para criar uma conta.");
      return;
    }
    setWorking(true);
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        : await supabase.auth.signUp({ email: normalizedEmail, password });
      if (result.error) throw result.error;
      if (result.data.session) onAuthenticated(result.data.session.user);
      else setMessage("Conta criada. Confirme seu e-mail para concluir o acesso.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setWorking(false);
    }
  };

  return <><div className="overlay top" onClick={close} /><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="close" onClick={close} aria-label="Fechar"><Icon name="close" /></button><h2 id="auth-title">{mode === "signin" ? "Entrar" : "Criar conta"}</h2>{supabase ? <form onSubmit={submit}><label className="field"><b>E-mail</b><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className="field"><b>Senha</b><input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <p className="form-error" role="alert">{message}</p>}<button className="primary" disabled={working}>{working ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}</button></form> : <p className="muted">Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local para habilitar o login.</p>}{supabase && <button className="auth-switch" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Ainda não tem conta? Criar conta" : "Já tem conta? Entrar"}</button>}</section></>;
}

function SuccessModal({ title, text, close }: { title: string; text: string; close: () => void }) {
  return <><div className="overlay top" /><div className="success-modal"><div className="success-check"><Icon name="check" size={28} /></div><h2>{title}</h2><p>{text}</p><button className="primary" onClick={close}>Concluir</button></div></>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [query, setQuery] = useState("");
  const [remoteProjects, setRemoteProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(Boolean(supabase));
  const [notice, setNotice] = useState(supabase ? "" : "Supabase ainda não está configurado. Crie o arquivo .env.local para habilitar login e salvamento.");
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [claimingProjectId, setClaimingProjectId] = useState<string | null>(null);
  const [claimedProjectId, setClaimedProjectId] = useState<string | null>(null);
  const [selected, setSelected] = useState(seedProjects[0]);
  const [aiOpen, setAiOpen] = useState(false);
  const [plan, setPlan] = useState("");
  const [success, setSuccess] = useState<null | "version" | "project">(null);
  const projects = [...remoteProjects, ...seedProjects];
  const mineProjects = user ? remoteProjects.filter((project) => project.ownerId === user.id) : [];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("acervo-projetos:theme");
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const nextTheme = current === "light" ? "dark" : "light";
      window.localStorage.setItem("acervo-projetos:theme", nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      return nextTheme;
    });
  };

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setNotice(error.message);
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoadingProjects(false);
      return;
    }
    let active = true;
    const loadProjects = async () => {
      setLoadingProjects(true);
      if (user) {
        const localProjects = readSavedProjects();
        if (localProjects.length) {
          const rows = localProjects.map((project) => projectToRow({
            ...project,
            id: project.id ?? crypto.randomUUID(),
            attachments: normalizeAttachments(project.attachments),
          }, user.id));
          const { error: migrationError } = await supabase.from("projects").upsert(rows, { onConflict: "id" });
          if (migrationError) setNotice(`Não foi possível importar os projetos deste navegador: ${migrationError.message}`);
          else {
            window.localStorage.removeItem(LEGACY_PROJECTS_STORAGE_KEY);
            setNotice(`${localProjects.length} projeto(s) local(is) importado(s) para o Supabase.`);
          }
        }
      }
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (!active) return;
      if (error) setNotice(`Erro ao carregar o acervo: ${error.message}`);
      else setRemoteProjects((data ?? []).map((row) => projectFromRow(row as ProjectRow)));
      setLoadingProjects(false);
    };
    void loadProjects();
    return () => { active = false; };
  }, [user?.id]);

  const releaseProjectClaim = async (projectId: string, account = user) => {
    if (!supabase || !account) return;
    const { error } = await supabase.rpc("release_project_claim", { target_project_id: projectId });
    if (error) setNotice(`Não foi possível liberar a reserva: ${error.message}`);
    setClaimedProjectId((current) => current === projectId ? null : current);
  };

  const beginContinuity = async (project: Project, account = user) => {
    if (!supabase) {
      setNotice("Configure o Supabase antes de assumir projetos.");
      return;
    }
    if (!account) {
      setSelected(project);
      setPendingScreen("continuity");
      setAuthOpen(true);
      return;
    }
    if (!isIfscEmail(account.email)) {
      setNotice("Use uma conta com e-mail institucional do IFSC para assumir projetos.");
      return;
    }
    if (!project.id || !UUID_PATTERN.test(project.id)) {
      setNotice("Este projeto de demonstração ainda não foi publicado no acervo e não pode ser assumido.");
      return;
    }
    if (project.status === "Em andamento") {
      setNotice("Este projeto já está em andamento e não pode ser assumido novamente.");
      return;
    }
    setClaimingProjectId(project.id);
    try {
      const { error } = await supabase.rpc("claim_project", { target_project_id: project.id });
      if (error) throw error;
      setClaimedProjectId(project.id);
      setScreen("continuity");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setClaimingProjectId(null);
    }
  };

  const go = (nextScreen: Screen) => {
    if (screen === "continuity" && nextScreen !== "continuity" && claimedProjectId) {
      void releaseProjectClaim(claimedProjectId);
    }
    if (nextScreen === "continuity") {
      void beginContinuity(selected);
      return;
    }
    if (nextScreen === "register" || nextScreen === "mine") {
      if (!supabase) {
        setNotice("Configure a URL e a chave publishable do Supabase no arquivo .env.local primeiro.");
        return;
      }
      if (!user) {
        setPendingScreen(nextScreen);
        setAuthOpen(true);
        return;
      }
      if (nextScreen === "register" && !isIfscEmail(user.email)) {
        setNotice("Use uma conta com e-mail institucional do IFSC para publicar projetos.");
        return;
      }
    }
    setScreen(nextScreen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectProject = (p: Project) => { setSelected(p); setScreen("detail"); window.scrollTo(0, 0); };
  const persistProject = async (project: Project, files: File[], successType: "version" | "project") => {
    if (!supabase) throw new Error("Configure a conexão com o Supabase antes de salvar.");
    if (!user) throw new Error("Entre na sua conta para salvar projetos.");
    if (!isIfscEmail(user.email)) throw new Error("Use uma conta com e-mail institucional do IFSC para publicar projetos.");
    const id = project.id ?? crypto.randomUUID();
    const uploadedPaths: string[] = [];
    try {
      const attachments: ProjectAttachment[] = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} excede o limite de 10 MB.`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        attachments.push({ name: file.name, path });
      }
      const savedProject = { ...project, id, ownerId: user.id, attachments };
      const { data, error } = await supabase.from("projects").insert(projectToRow(savedProject, user.id)).select("*").single();
      if (error) throw error;
      const persisted = projectFromRow(data as ProjectRow);
      setRemoteProjects((current) => [persisted, ...current.filter((item) => item.id !== persisted.id)]);
      setSelected(persisted);
      setSuccess(successType);
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from(ATTACHMENTS_BUCKET).remove(uploadedPaths);
      throw error;
    }
  };
  const saveProject = (project: Project, files: File[]) => persistProject(project, files, "project");
  const saveVersion = async (project: Project) => {
    await persistProject(project, [], "version");
    if (supabase && project.versionOf && UUID_PATTERN.test(project.versionOf)) {
      const { error } = await supabase.rpc("release_project_claim", { target_project_id: project.versionOf });
      if (error) setNotice(`Versão salva, mas a reserva não pôde ser liberada: ${error.message}`);
      setClaimedProjectId((current) => current === project.versionOf ? null : current);
    }
  };
  const handleAuthenticated = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setAuthOpen(false);
    if (pendingScreen === "continuity") {
      setPendingScreen(null);
      void beginContinuity(selected, authenticatedUser);
      return;
    }
    if (pendingScreen === "register") {
      if (isIfscEmail(authenticatedUser.email)) setScreen(pendingScreen);
      else setNotice("Use uma conta com e-mail institucional do IFSC para publicar projetos.");
    } else if (pendingScreen) setScreen(pendingScreen);
    setPendingScreen(null);
  };
  const signOut = async () => {
    if (!supabase) return;
    if (claimedProjectId) await releaseProjectClaim(claimedProjectId);
    const { error } = await supabase.auth.signOut();
    if (error) setNotice(error.message);
    else { setScreen("home"); setNotice("Você saiu da sua conta."); }
  };
  return <Shell screen={screen} go={go} user={user} onOpenAuth={() => setAuthOpen(true)} onSignOut={signOut} notice={notice} dismissNotice={() => setNotice("")} theme={theme} toggleTheme={toggleTheme}>
    {loadingProjects && <p className="backend-loading" role="status">Carregando projetos...</p>}
    {screen === "home" && <Home projects={projects} go={go} setSearch={setQuery} selectProject={selectProject} />}
    {screen === "archive" && <Archive projects={projects} go={go} query={query} setQuery={setQuery} selectProject={selectProject} />}
    {screen === "detail" && <Detail project={selected} projects={projects} openAI={() => setAiOpen(true)} onAssume={() => { void beginContinuity(selected); }} claiming={claimingProjectId === selected.id} selectProject={selectProject} />}
    {screen === "continuity" && <Continuity project={selected} initialPlan={plan} onSuccess={saveVersion} onCancel={() => { if (claimedProjectId) void releaseProjectClaim(claimedProjectId); setScreen("detail"); }} />}
    {screen === "register" && <Register onSuccess={saveProject} />}
    {screen === "mine" && <Mine projects={mineProjects} go={go} selectProject={selectProject} />}
    {aiOpen && <AIPanel project={selected} close={() => setAiOpen(false)} usePlan={(value) => { setPlan(value); setAiOpen(false); void beginContinuity(selected); }} />}
    {authOpen && <AuthModal close={() => setAuthOpen(false)} onAuthenticated={handleAuthenticated} />}
    {success && <SuccessModal title={success === "version" ? "Nova versão criada com sucesso!" : "Projeto cadastrado com sucesso!"} text={success === "version" ? "O projeto já está disponível em Meus Projetos." : "A ficha do projeto foi criada e já pode ser acessada."} close={() => { setSuccess(null); go("mine"); }} />}
  </Shell>;
}
