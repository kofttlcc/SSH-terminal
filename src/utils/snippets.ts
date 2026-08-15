export function extractSnippetVariables(command: string): string[] {
  const regex = /\{\{([a-zA-Z0-9_\-\s]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(command)) !== null) {
    if (match[1]) {
      matches.add(match[1].trim());
    }
  }
  return Array.from(matches);
}

export function renderSnippetCommand(command: string, values: Record<string, string>): string {
  let result = command;
  for (const [key, val] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, val);
  }
  return result;
}
