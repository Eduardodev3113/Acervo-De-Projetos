import { createClient } from "@supabase/supabase-js";

const emailDomains = ["ifsc.edu.br", "aluno.ifsc.edu.br"];
const projectAdminEmails = ["eduardo.r2008@aluno.ifsc.edu.br", "vinicius.amf20@aluno.ifsc.edu.br"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function requestError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function databaseClient(accessToken) {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw requestError("Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local.", 503);

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}

async function requireIfscUser(request) {
  const authorization = request.headers.authorization ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw requestError("Entre com sua conta institucional para continuar.", 401);

  const accessToken = match[1];
  const client = databaseClient(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw requestError("Sua sessão expirou. Entre novamente.", 401);

  const email = data.user.email?.trim().toLowerCase() ?? "";
  if (!emailDomains.some((domain) => email.endsWith(`@${domain}`))) {
    throw requestError("Use uma conta com e-mail institucional do IFSC.", 403);
  }

  return { client, user: data.user };
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 100_000) throw requestError("A solicitação excede o limite permitido.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw requestError("O corpo da solicitação precisa ser JSON válido.");
  }
}

function text(value, maxLength = 2_000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function textArray(value, maxItems = 50, maxLength = 160) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").slice(0, maxItems).map((item) => item.trim().slice(0, maxLength)).filter(Boolean)
    : [];
}

function attachments(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const name = text(item.name, 255);
    if (!name) return [];
    return [{ name, ...(typeof item.path === "string" ? { path: text(item.path, 700) } : {}) }];
  });
}

function projectRow(value, ownerId) {
  if (!value || typeof value !== "object") throw requestError("Informe os dados do projeto.");
  const name = text(value.name, 160);
  const description = text(value.description, 5_000);
  if (!name || !description) throw requestError("O projeto precisa ter nome e descrição.");

  return {
    id: typeof value.id === "string" && uuidPattern.test(value.id) ? value.id : crypto.randomUUID(),
    owner_id: ownerId,
    name,
    project_class: text(value.project_class, 160),
    year: text(value.year, 8) || String(new Date().getFullYear()),
    tech: textArray(value.tech),
    resources: textArray(value.resources),
    area: text(value.area, 160),
    oi_core: text(value.oi_core, 80),
    status: text(value.status, 80) || "Em andamento",
    description,
    objective: text(value.objective, 5_000),
    results: text(value.results, 5_000),
    team: textArray(value.team),
    attachments: attachments(value.attachments),
    mine_status: text(value.mine_status, 80) || "Em desenvolvimento",
    version_of: typeof value.version_of === "string" && uuidPattern.test(value.version_of) ? value.version_of : null,
    plan: text(value.plan, 5_000),
    due_date: typeof value.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.due_date) ? value.due_date : null,
  };
}

async function handleProjectList(response) {
  const client = databaseClient();
  const { data, error } = await client.from("projects").select("*").order("created_at", { ascending: false });
  if (error) throw requestError(`Não foi possível carregar os projetos: ${error.message}`, 502);
  sendJson(response, 200, { projects: data ?? [] });
}

async function handleProjectImport(request, response) {
  const { client, user } = await requireIfscUser(request);
  const body = await readJson(request);
  if (!Array.isArray(body.projects) || body.projects.length > 100) throw requestError("Envie uma lista de até 100 projetos.");
  const rows = [...new Map(body.projects.map((project) => {
    const row = projectRow(project, user.id);
    return [row.id, row];
  })).values()];
  const { data: existingRows, error: lookupError } = await client.from("projects").select("id").in("id", rows.map((row) => row.id));
  if (lookupError) throw requestError(`Não foi possível verificar projetos existentes: ${lookupError.message}`, 502);
  const existingIds = new Set((existingRows ?? []).map((row) => row.id));
  const newRows = rows.filter((row) => !existingIds.has(row.id));
  const { error } = newRows.length ? await client.from("projects").insert(newRows) : { error: null };
  if (error) throw requestError(`Não foi possível importar os projetos: ${error.message}`, 409);
  sendJson(response, 200, { imported: newRows.length, skipped: rows.length - newRows.length });
}

async function handleProjectCreate(request, response) {
  const { client, user } = await requireIfscUser(request);
  const body = await readJson(request);
  const row = projectRow(body.project, user.id);

  if (row.version_of) {
    const { error: claimError } = await client.rpc("renew_project_claim", { target_project_id: row.version_of });
    if (claimError) throw requestError(claimError.message, 409);
  }

  const { data, error } = await client.from("projects").insert(row).select("*").single();
  if (error) throw requestError(`Não foi possível salvar o projeto: ${error.message}`, 409);
  sendJson(response, 201, { project: data });
}

async function handleProjectDelete(request, response, projectId) {
  if (!uuidPattern.test(projectId)) throw requestError("ID de projeto inválido.");
  const { client, user } = await requireIfscUser(request);
  const email = user.email?.trim().toLowerCase() ?? "";
  const isAdmin = projectAdminEmails.includes(email);
  const { data: project, error: lookupError } = await client.from("projects")
    .select("id,owner_id,attachments")
    .eq("id", projectId)
    .maybeSingle();
  if (lookupError) throw requestError(`Não foi possível localizar o projeto: ${lookupError.message}`, 502);
  if (!project) throw requestError("Projeto não encontrado.", 404);
  if (project.owner_id !== user.id && !isAdmin) throw requestError("Você só pode excluir projetos que criou.", 403);

  const { error: deleteError } = await client.from("projects").delete().eq("id", projectId);
  if (deleteError) throw requestError(`Não foi possível excluir o projeto: ${deleteError.message}`, 409);

  const filePaths = attachments(project.attachments).map((attachment) => attachment.path).filter(Boolean);
  if (filePaths.length) {
    const { error: storageError } = await client.storage.from("project-attachments").remove(filePaths);
    if (storageError) console.error(`Projeto ${projectId} excluído, mas arquivos anexos não foram removidos: ${storageError.message}`);
  }
  sendJson(response, 200, { deleted: true });
}

async function handleProjectAbandon(request, response, projectId) {
  if (!uuidPattern.test(projectId)) throw requestError("ID de projeto inválido.");
  const { client, user } = await requireIfscUser(request);
  const { data: project, error } = await client.from("projects")
    .update({ status: "Pausado", mine_status: "Abandonados" })
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .not("version_of", "is", null)
    .in("status", ["Em andamento", "Planejamento"])
    .select("id,version_of")
    .maybeSingle();
  if (error) throw requestError(`Não foi possível abandonar a continuação: ${error.message}`, 409);
  if (!project) throw requestError("Você só pode abandonar uma continuação ativa que criou.", 409);

  const { error: releaseError } = await client.rpc("release_project_claim", { target_project_id: project.version_of });
  if (releaseError) console.error(`Continuação ${projectId} pausada, mas a reserva do projeto original não foi liberada: ${releaseError.message}`);
  sendJson(response, 200, { project });
}

async function handleProjectClaim(request, response, projectId, action) {
  if (!uuidPattern.test(projectId)) throw requestError("ID de projeto inválido.");
  const { client } = await requireIfscUser(request);
  const rpc = action === "renew" ? "renew_project_claim" : action === "release" ? "release_project_claim" : "claim_project";
  const { error } = await client.rpc(rpc, { target_project_id: projectId });
  if (error) throw requestError(error.message, 409);
  sendJson(response, 200, { ok: true });
}

export async function handleProjectsApi(request, response) {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const claimMatch = pathname.match(/^\/api\/projects\/([0-9a-f-]+)\/claim(?:\/(renew|release))?$/i);
  const projectActionMatch = pathname.match(/^\/api\/projects\/([0-9a-f-]+)(?:\/(abandon))?$/i);

  try {
    if (pathname === "/api/projects") {
      if (request.method === "GET") await handleProjectList(response);
      else if (request.method === "POST") await handleProjectCreate(request, response);
      else sendJson(response, 405, { error: "Método não permitido." });
      return true;
    }
    if (pathname === "/api/projects/import") {
      if (request.method !== "POST") sendJson(response, 405, { error: "Método não permitido." });
      else await handleProjectImport(request, response);
      return true;
    }
    if (projectActionMatch && projectActionMatch[2] === "abandon") {
      if (request.method !== "POST") sendJson(response, 405, { error: "Método não permitido." });
      else await handleProjectAbandon(request, response, projectActionMatch[1]);
      return true;
    }
    if (projectActionMatch && !projectActionMatch[2]) {
      if (request.method !== "DELETE") sendJson(response, 405, { error: "Método não permitido." });
      else await handleProjectDelete(request, response, projectActionMatch[1]);
      return true;
    }
    if (claimMatch) {
      if (request.method !== "POST") sendJson(response, 405, { error: "Método não permitido." });
      else await handleProjectClaim(request, response, claimMatch[1], claimMatch[2] ?? "claim");
      return true;
    }
    return false;
  } catch (error) {
    sendJson(response, error.status ?? 500, { error: error.message || "Erro interno na API de projetos." });
    return true;
  }
}