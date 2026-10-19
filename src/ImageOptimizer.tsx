import { useEffect, useRef, useState } from "react"

import type { ChangeEvent } from "react"

type OptimizedImage = {
  id: string

  originalName: string

  originalSize: number

  optimizedName?: string

  optimizedSize?: number

  downloadUrl?: string

  error?: string
}

const MAX_DIMENSION = 1920

const WEBP_QUALITY = 0.82

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`

  const units = ["KiB", "MiB", "GiB"]

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)) - 1,
    units.length - 1,
  )

  return `${(bytes / 1024 ** (unitIndex + 1)).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[unitIndex]}`
}

function webpName(name: string) {
  return `${name.replace(/\.[^.]+$/, "")}.webp`
}

async function optimizeImage(file: File) {
  const bitmap = await createImageBitmap(file)

  try {
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
    )

    const canvas = document.createElement("canvas")

    canvas.width = Math.max(1, Math.round(bitmap.width * scale))

    canvas.height = Math.max(1, Math.round(bitmap.height * scale))

    const context = canvas.getContext("2d")

    if (!context)
      throw new Error("Este navegador não conseguiu preparar a imagem.")

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else
            reject(
              new Error("Este navegador não conseguiu gerar a imagem WebP."),
            )
        },
        "image/webp",
        WEBP_QUALITY,
      )
    })

    if (blob.type !== "image/webp") {
      throw new Error(
        "A conversão para WebP não é compatível com este navegador.",
      )
    }

    return blob
  } finally {
    bitmap.close()
  }
}

export default function ImageOptimizer() {
  const [files, setFiles] = useState<File[]>([])

  const [results, setResults] = useState<OptimizedImage[]>([])

  const [processing, setProcessing] = useState(false)

  const [error, setError] = useState("")

  const inputRef = useRef<HTMLInputElement>(null)

  const downloadUrls = useRef<string[]>([])

  useEffect(
    () => () => downloadUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  )

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? [])

    const supported = selected.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    )

    if (supported.length !== selected.length) {
      setError(
        "Alguns arquivos foram ignorados. Selecione imagens JPG, PNG ou WebP.",
      )
    } else {
      setError("")
    }

    downloadUrls.current.forEach((url) => URL.revokeObjectURL(url))

    downloadUrls.current = []

    setFiles((current) => {
      const known = new Set(
        current.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
      )

      return [
        ...current,
        ...supported.filter(
          (file) =>
            !known.has(`${file.name}:${file.size}:${file.lastModified}`),
        ),
      ]
    })

    setResults([])

    event.currentTarget.value = ""
  }

  const processFiles = async () => {
    if (!files.length || processing) return
    downloadUrls.current.forEach((url) => URL.revokeObjectURL(url));
    downloadUrls.current = [];
    setProcessing(true);

    setResults([])

    try {
      for (const file of files) {
        try {
          const blob = await optimizeImage(file)

          const downloadUrl = URL.createObjectURL(blob)

          downloadUrls.current.push(downloadUrl)

          setResults((current) => [
            ...current,
            {
              id: crypto.randomUUID(),

              originalName: file.name,

              originalSize: file.size,

              optimizedName: webpName(file.name),

              optimizedSize: blob.size,

              downloadUrl,
            },
          ])
        } catch (processingError) {
          setResults((current) => [
            ...current,
            {
              id: crypto.randomUUID(),

              originalName: file.name,

              originalSize: file.size,

              error:
                processingError instanceof Error
                  ? processingError.message
                  : "Falha ao processar esta imagem.",
            },
          ])
        }
      }
    } finally {
      setProcessing(false)
    }
  }

  const clearFiles = () => {
    downloadUrls.current.forEach((url) => URL.revokeObjectURL(url))

    downloadUrls.current = []

    setFiles([])

    setResults([])

    setError("")

    if (inputRef.current) inputRef.current.value = ""
  }

  const completed = results.filter(
    (result) => result.optimizedSize !== undefined,
  )

  const totalOriginalSize = completed.reduce(
    (total, result) => total + result.originalSize,
    0,
  )

  const totalOptimizedSize = completed.reduce(
    (total, result) => total + (result.optimizedSize ?? 0),
    0,
  )

  const sizeDifference = totalOriginalSize
    ? (1 - totalOptimizedSize / totalOriginalSize) * 100
    : 0

  const sizeDifferenceLabel =
    sizeDifference > 0
      ? `${sizeDifference.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de redução`
      : sizeDifference < 0
        ? `${Math.abs(sizeDifference).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de aumento`
        : "sem redução de tamanho"

  return (
    <section className="page image-optimizer">
      <div className="optimizer-heading">
        <p className="breadcrumb">Ferramentas do acervo</p>
        <h1>Otimizar fotos</h1>
        <p>
          Converta imagens em lote para WebP e reduza o tamanho dos arquivos
          antes de anexá-los aos projetos.
        </p>
      </div>
      <div className="panel optimizer-panel">
        <div className="optimizer-privacy">
          <b>Processamento privado</b>
          <span>
            As imagens são processadas neste navegador. Nada é enviado ao site
            nem a um serviço externo.
          </span>
        </div>
        <div className="optimizer-settings">
          <div>
            <b>Formatos aceitos</b>
            <span>JPG, PNG e WebP</span>
          </div>
          <div>
            <b>Formato de saída</b>
            <span>WebP · qualidade 82% · máximo de 1920 px</span>
          </div>
          <div>
            <b>Documentos PDF/ZIP</b>
            <span>
              Não são convertidos nem compactados por esta ferramenta.
            </span>
          </div>
        </div>
        <input
          ref={inputRef}
          className="optimizer-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={addFiles}
        />
        <div className="optimizer-actions">
          <button
            className="secondary"
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={processing}
          >
            Selecionar imagens
          </button>
          <button
            className="primary"
            type="button"
            onClick={() => {
              void processFiles()
            }}
            disabled={!files.length || processing}
          >
            {processing
              ? `Processando ${results.length} de ${files.length}...`
              : "Converter e comprimir"}
          </button>
          {files.length > 0 && (
            <button
              className="secondary"
              type="button"
              onClick={clearFiles}
              disabled={processing}
            >
              Limpar
            </button>
          )}
        </div>
        {error && (
          <p className="form-error optimizer-error" role="alert">
            {error}
          </p>
        )}
        {files.length > 0 && (
          <ul className="selected-attachments optimizer-file-list">
            {files.map((file) => (
              <li key={`${file.name}:${file.size}:${file.lastModified}`}>
                <span>
                  {file.name} · {formatBytes(file.size)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {results.length > 0 && (
        <section className="optimizer-results" aria-live="polite">
          <div className="optimizer-summary">
            <div>
              <b>
                {completed.length} de {results.length} imagens processadas
              </b>
              <span>
                {formatBytes(totalOriginalSize)} →{" "}
                {formatBytes(totalOptimizedSize)} · {sizeDifferenceLabel}
              </span>
            </div>
          </div>
          <ul className="optimizer-result-list">
            {results.map((result) => (
              <li className="panel optimizer-result" key={result.id}>
                <div>
                  <b>{result.originalName}</b>
                  <span>
                    {formatBytes(result.originalSize)}
                    {result.optimizedSize !== undefined &&
                      ` → ${formatBytes(result.optimizedSize)}`}
                  </span>
                  {result.error && (
                    <span className="form-error">{result.error}</span>
                  )}
                </div>
                {result.downloadUrl && result.optimizedName && (
                  <a
                    className="primary small"
                    href={result.downloadUrl}
                    download={result.optimizedName}
                  >
                    Baixar WebP
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}
