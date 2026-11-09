import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const seedDirectory = resolve(root, "supabase/seed");
const publicApiDirectory = resolve(root, "public/api");
const seed = JSON.parse(await readFile(resolve(seedDirectory, "projects.json"), "utf8"));

if (
  seed.version !== 1 ||
  !Array.isArray(seed.projects) ||
  seed.projects.length !== seed.projectCount ||
  seed.projects.reduce((count, project) => count + (project.attachments?.length ?? 0), 0) !== seed.attachmentCount
) {
  throw new Error("O catálogo de projetos está inconsistente.");
}

await mkdir(publicApiDirectory, { recursive: true });

const projects = seed.projects.map((project) => ({
  ...project,
  attachments: (project.attachments ?? []).map(({ name }) => ({ name })),
}));

await writeFile(
  resolve(publicApiDirectory, "projects.json"),
  `${JSON.stringify({
    version: seed.version,
    projectCount: projects.length,
    attachmentCount: projects.reduce((count, project) => count + project.attachments.length, 0),
    projects,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Catálogo público gerado: ${projects.length} projetos. As imagens são servidas pelo Supabase Storage.`);
