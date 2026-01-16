/**
 * Resolves a dot-notation path from a nested object.
 * @param obj The object to resolve the path from.
 * @param path The dot-notation path (e.g., "user.name").
 * @returns The value at the specified path or undefined if not found.
 */
function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (
      prev,
      curr,
    ) => (prev && typeof prev === "object"
      ? (prev as Record<string, unknown>)[curr]
      : undefined),
    obj,
  );
}

/**
 * Recursively interpolates a template with values from a context object.
 * It replaces placeholders in the format `{{path.to.variable}}`.
 *
 * @param template The template to interpolate (can be any type).
 * @param context The context object with values for interpolation.
 * @returns The interpolated template.
 */
export function interpolate<T>(
  template: T,
  context: Record<string, unknown>,
): T {
  if (typeof template === "string") {
    // If the entire string is a single placeholder, return the raw value
    const singlePlaceholderMatch = template.match(
      /^\{\{\s*([\w\d._-]+)\s*\}\}$/,
    );
    if (singlePlaceholderMatch && singlePlaceholderMatch[1]) {
      return resolvePath(context, singlePlaceholderMatch[1]) as T;
    }

    // Otherwise, replace all placeholders with their string-coerced values
    return template.replace(
      /\{\{\s*([\w\d._-]+)\s*\}\}/g,
      (_match, path: string) => {
        const value = resolvePath(context, path);
        return value !== undefined && value !== null ? String(value) : "";
      },
    ) as T;
  }

  if (Array.isArray(template)) {
    return template.map((item) => interpolate(item, context)) as T;
  }

  if (typeof template === "object" && template !== null) {
    const newObj: Record<string, unknown> = {};
    for (const key in template) {
      if (Object.prototype.hasOwnProperty.call(template, key)) {
        newObj[key] = interpolate(
          (template as Record<string, unknown>)[key],
          context,
        );
      }
    }
    return newObj as T;
  }

  return template;
}
