/**
 * Extract the text from an MCP tool result.
 * Assumes the result has shape `{ content: [{ text: string }] }`.
 */
export function getText(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content[0]!.text;
}

/**
 * Check if an MCP tool result is an error response.
 * Checks for `{ isError: true }` on the result object.
 */
export function isError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true;
}
