/** Renders a Markdown description down to plain text for a card preview line. */
export function stripMarkdownForPreview(description: string): string {
  return description
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_`~>]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}
