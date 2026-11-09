import { createInterface } from "node:readline/promises"

import { readFile } from "node:fs/promises"

import { resolve } from "node:path"

import { fileURLToPath } from "node:url"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()

const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

const repositoryPath = resolve(fileURLToPath(new URL("../", import.meta.url)))

const seedDirectory = resolve(repositoryPath, "supabase/seed")

const seedPath = resolve(seedDirectory, "projects.json")

const bucket = "project-attachments"

const emailPattern = /^[^@\s]+@(?:aluno\.)?ifsc\.edu\.br$/i

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    "Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local.",
  )
}

const seed = JSON.parse(await readFile(seedPath, "utf8"))

if (
  seed.version !== 1 ||
  !Array.isArray(seed.projects) ||
  seed.projects.length !== seed.projectCount ||
  seed.projects.reduce(
    (count, project) => count + (project.attachments?.length ?? 0),
    0,
  ) !== seed.attachmentCount
) {
  throw new Error(
    "O manifesto da carga inicial está incompleto ou em uma versão não suportada.",
  )
}

const ids = new Set(seed.projects.map((project) => project.id))

if (
  ids.size !== seed.projects.length ||
  seed.projects.some(
    (project) => project.version_of && !ids.has(project.version_of),
  )
) {
  throw new Error(
    "O manifesto contém IDs duplicados ou referências a projetos ausentes.",
  )
}

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  throw new Error(
    "Execute este comando em um terminal interativo para informar as credenciais da conta IFSC.",
  )
}

const readLine = createInterface({
  input: process.stdin,
  output: process.stdout,
})

const emailInput = await readLine.question("E-mail institucional IFSC: ")

readLine.close()

if (typeof emailInput !== "string" || !emailInput.trim()) {
  throw new Error(
    "Nenhum e-mail foi recebido. Abra Terminal > Novo Terminal no VS Code e execute npm run seed:supabase diretamente nesse terminal.",
  )
}

const email = emailInput.trim().toLowerCase()

if (!emailPattern.test(email))
  throw new Error("Use uma conta com e-mail institucional do IFSC.")

function readHidden(prompt) {
  const { stdin, stdout } = process

  return new Promise((resolveInput, rejectInput) => {
    let value = ""

    stdout.write(prompt)

    stdin.setRawMode(true)

    stdin.resume()

    const finish = (error) => {
      stdin.off("data", onData)

      stdin.setRawMode(false)

      stdout.write("\n")

      if (error) rejectInput(error)
      else resolveInput(value)
    }

    const onData = (chunk) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Operação cancelada."))

          return
        }

        if (character === "\r" || character === "\n") {
          finish()

          return
        }

        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1)

          continue
        }

        if (character >= " ") value += character
      }
    }

    stdin.on("data", onData)
  })
}

const password = await readHidden("Senha IFSC (entrada oculta): ")

if (!password) throw new Error("A senha não pode ficar vazia.")

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

const { data: sessionData, error: signInError } =
  await supabase.auth.signInWithPassword({ email, password })

if (signInError)
  throw new Error(
    `Não foi possível autenticar a conta IFSC: ${signInError.message}`,
  )

const user = sessionData.user

if (!user?.id || !emailPattern.test(user.email ?? "")) {
  throw new Error("A sessão autenticada não pertence a uma conta IFSC.")
}

const { data: existingRows, error: lookupError } = await supabase

  .from("projects")

  .select("id")

  .in("id", [...ids])

if (lookupError)
  throw new Error(
    `Não foi possível verificar projetos existentes: ${lookupError.message}`,
  )

const existingIds = new Set((existingRows ?? []).map((row) => row.id))

const pendingProjects = seed.projects.filter(
  (project) => !existingIds.has(project.id),
)

if (!pendingProjects.length) {
  console.log(
    `A carga inicial já está aplicada: ${seed.projects.length} projetos encontrados.`,
  )
} else {
  const uploadedPaths = []

  try {
    const rows = []

    for (const project of pendingProjects) {
      const attachments = []

      for (const attachment of project.attachments ?? []) {
        const bytes = await readFile(resolve(seedDirectory, attachment.asset))

        const extension = attachment.asset.split(".").at(-1)?.toLowerCase()

        const contentType =
          extension === "png"
            ? "image/png"
            : extension === "jpg" || extension === "jpeg"
              ? "image/jpeg"
              : ""

        if (!contentType)
          throw new Error(
            `Formato de imagem não suportado no seed: ${attachment.asset}`,
          )

        const path = `${user.id}/${project.id}/${attachment.asset.split(/[\\/]/).at(-1)}`

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, bytes, {
            contentType,

            upsert: true,

            cacheControl: "31536000",
          })

        if (uploadError)
          throw new Error(
            `Falha ao enviar ${attachment.name}: ${uploadError.message}`,
          )

        uploadedPaths.push(path)

        attachments.push({ name: attachment.name, path })
      }

      const { attachments: _seedAttachments, ...projectData } = project

      rows.push({
        ...projectData,

        owner_id: user.id,

        team: [],

        mine_status: "Concluídos",

        attachments,
      })
    }

    const { error: insertError } = await supabase.from("projects").insert(rows)

    if (insertError)
      throw new Error(`Falha ao inserir os projetos: ${insertError.message}`)
  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage
        .from(bucket)
        .remove(uploadedPaths)

      if (cleanupError)
        console.error(
          `Não foi possível remover alguns anexos enviados: ${cleanupError.message}`,
        )
    }

    throw error
  }

  console.log(
    `Carga inicial concluída: ${pendingProjects.length} projetos e ${uploadedPaths.length} imagens adicionados.`,
  )
}
