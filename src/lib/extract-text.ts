// PDF and Markdown text extraction in the browser.
// Uses pdf.js with a CDN-hosted worker that matches the bundled API version.
import * as pdfjs from "pdfjs-dist";

// pdf.js requires its worker to match the API version. Use the version from the
// installed package and load the worker from a CDN to avoid bundling complexity.
const PDFJS_VERSION = (pdfjs as unknown as { version: string }).version;
(pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".md") || file.type === "text/markdown" || file.type === "text/plain") {
    return await file.text();
  }
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return await extractFromPdf(file);
  }
  throw new Error("Unsupported file type. Please upload a .pdf or .md file.");
}

async function extractFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    pageTexts.push(text);
  }
  return pageTexts.join("\n\n");
}
