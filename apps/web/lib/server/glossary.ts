import "server-only";

export interface GlossaryEntry {
  source: string | null;
  target: string;
}

export function parseGlossaryText(glossaryText: string): GlossaryEntry[] {
  return glossaryText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map(parseGlossaryLine)
    .filter((entry): entry is GlossaryEntry => entry !== null);
}

function parseGlossaryLine(line: string): GlossaryEntry | null {
  const arrowMatch = line.match(/^(.+?)\s*(?:=>|->)\s*(.+)$/);
  if (arrowMatch) {
    const source = arrowMatch[1]?.trim();
    const target = arrowMatch[2]?.trim();
    if (!source || !target) {
      return null;
    }

    return { source, target };
  }

  return { source: null, target: line };
}

export function buildGlossaryPrompt(glossaryText: string): string {
  const entries = parseGlossaryText(glossaryText);
  if (entries.length === 0) {
    return "";
  }

  const preferredTerms = entries
    .map((entry) => entry.target)
    .filter((value, index, array) => array.indexOf(value) === index);
  const corrections = entries.filter((entry) => entry.source);
  const lines = [
    "Preferred domain terminology:",
    ...preferredTerms.map((term) => `- ${term}`),
  ];

  if (corrections.length > 0) {
    lines.push("", "Correction hints:");
    lines.push(
      ...corrections.map((entry) => `- ${entry.source} => ${entry.target}`),
    );
  }

  lines.push(
    "",
    "Use the preferred spellings above when transcribing. If an alias appears, normalize it to the canonical term.",
  );

  return lines.join("\n");
}

export function applyGlossaryToText(text: string, glossaryText: string): string {
  const replacements = parseGlossaryText(glossaryText)
    .filter((entry): entry is GlossaryEntry & { source: string } => Boolean(entry.source))
    .sort((left, right) => right.source.length - left.source.length);

  return replacements.reduce((current, entry) => {
    return current.split(entry.source).join(entry.target);
  }, text);
}
