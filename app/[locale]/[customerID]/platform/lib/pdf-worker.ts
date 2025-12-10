import { pdfjs } from "react-pdf"

const workerSrc = "/pdf-worker.js"

export function ensurePdfWorker() {
  if (typeof window === "undefined") return
  if (pdfjs.GlobalWorkerOptions.workerSrc === workerSrc) return
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
}
