import { pdfjs } from "react-pdf"

export async function parsePdfTextFromUrl(url: string): Promise<string> {
  if (!url) return ""

  try {
    const pdf = await pdfjs.getDocument(url).promise
    const pages: string[] = []

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex)
      const content = await page.getTextContent()

      const strings = content.items
        .map(item => {
          if (
            typeof item === "object" &&
            item !== null &&
            "str" in item &&
            typeof (item as { str?: unknown }).str === "string"
          ) {
            return (item as { str: string }).str
          }
          return ""
        })
        .filter(Boolean)
        .join(" ")

      pages.push(strings)
    }

    return pages.join("\n\n")
  } catch (error) {
    console.warn("Failed to extract PDF text", error)
    return ""
  }
}
