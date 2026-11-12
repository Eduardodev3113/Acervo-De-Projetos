export interface CatalogProject {
  id: string
  name: string
  project_class: string
  year: string
  tech: string[]
  resources?: string[]
  area?: string
  oi_core?: string
  status: string
  description: string
  objective?: string
  results?: string
  team?: string[]
  attachments?: ProjectAttachment[]
  mine_status?: string
  version_of?: string | null
  plan?: string
  due_date?: string | null
}

export interface ProjectAttachment {
  name: string
  path?: string
}

export interface ProjectRow extends CatalogProject {
  owner_id: string
}

export interface DatabaseProjectsResponse {
  source: "database"
  projects: ProjectRow[]
}

export interface CatalogProjectsResponse {
  source: "catalog"
  projects: CatalogProject[]
}

export type ProjectsResponse = DatabaseProjectsResponse | CatalogProjectsResponse

export interface ProjectSuggestion {
  title: string
  text: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const apiBaseUrl =
  import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, "") ?? ""

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isCatalogProject(value: unknown): value is CatalogProject {
  if (!isRecord(value)) return false
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.project_class === "string" &&
    typeof value.year === "string" &&
    isStringArray(value.tech) &&
    typeof value.status === "string" &&
    typeof value.description === "string" &&
    (value.attachments === undefined ||
      (Array.isArray(value.attachments) &&
        value.attachments.every(
          (attachment) =>
            isRecord(attachment) &&
            typeof attachment.name === "string" &&
            (attachment.path === undefined ||
              typeof attachment.path === "string"),
        )))
  )
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response

  try {
    const headers = new Headers(init?.headers)

    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }

    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,

      headers,
    })
  } catch {
    throw new Error(
      "Não foi possível conectar à API do projeto. Confira se o servidor está ativo.",
    )
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `A API respondeu com o erro ${response.status}.`

    throw new Error(message)
  }

  return body
}

export async function getProjects(
  signal?: AbortSignal,
): Promise<ProjectsResponse> {
  const body = await requestJson("/api/projects", { signal })
  if (!isRecord(body) || !Array.isArray(body.projects)) {
    throw new Error("A API retornou um catálogo inválido.")
  }
  if (body.source === "catalog" && body.projects.every(isCatalogProject)) {
    return { source: "catalog", projects: body.projects }
  }
  if (body.source === "database") {
    const projects = body.projects.filter(
      (project): project is ProjectRow =>
        isCatalogProject(project) &&
        isRecord(project) &&
        typeof project.owner_id === "string",
    )
    if (projects.length === body.projects.length) {
      return { source: "database", projects }
    }
  }
  throw new Error("A API retornou projetos em um formato não reconhecido.")
}

export async function getProjectSuggestions(
  project: Record<string, string | string[]>,

  signal?: AbortSignal,
): Promise<{ suggestions: ProjectSuggestion[] }> {
  const body = await requestJson("/api/ai/suggestions", {
    method: "POST",
    body: JSON.stringify({ project }),
    signal,
  })
  if (
    !isRecord(body) ||
    !Array.isArray(body.suggestions) ||
    body.suggestions.length !== 4 ||
    !body.suggestions.every(
      (suggestion) =>
        isRecord(suggestion) &&
        typeof suggestion.title === "string" &&
        typeof suggestion.text === "string",
    )
  ) {
    throw new Error("A API retornou sugestões em um formato inválido.")
  }
  return { suggestions: body.suggestions }
}

export async function sendChatMessage(
  messages: ChatMessage[],
  project: Record<string, string | string[]>,
  suggestions: ProjectSuggestion[],
  signal?: AbortSignal,
): Promise<{ reply: string; remaining: number }> {
  const body = await requestJson("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages, project, suggestions }),
    signal,
  })

  if (
    !isRecord(body) ||
    typeof body.reply !== "string" ||
    typeof body.remaining !== "number"
  ) {
    throw new Error("A API retornou uma resposta de chat inválida.")
  }

  return { reply: body.reply, remaining: body.remaining }
}
