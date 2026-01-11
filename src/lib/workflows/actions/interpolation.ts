/**
 * Resolves a dot-notation path from a nested object.
 * @param obj The object to resolve the path from.
 * @param path The dot-notation path (e.g., "user.name").
 * @returns The value at the specified path or undefined if not found.
 */
function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => (prev ? prev[curr] : undefined), obj);
}

/**
 * Recursively interpolates a template with values from a context object.
 * It replaces placeholders in the format `{{path.to.variable}}`.
 *
 * @param template The template to interpolate (can be any type).
 * @param context The context object with values for interpolation.
 * @returns The interpolated template.
 */
export function interpolate<T>(template: T, context: Record<string, any>): T {
  if (typeof template === 'string') {
    // If the entire string is a single placeholder, return the raw value
    const singlePlaceholderMatch = template.match(/^\{\{\s*([\w\d._-]+)\s*\}\}$/);
    if (singlePlaceholderMatch) {
      return resolvePath(context, singlePlaceholderMatch[1]);
    }

    // Otherwise, replace all placeholders with their string-coerced values
    return template.replace(/\{\{\s*([\w\d._-]+)\s*\}\}/g, (match, path) => {
      const value = resolvePath(context, path);
      return value !== undefined && value !== null ? String(value) : '';
    }) as any;
  }

  if (Array.isArray(template)) {
    return template.map(item => interpolate(item, context)) as any;
  }

  if (typeof template === 'object' && template !== null) {
    const newObj: { [key: string]: any } = {};
    for (const key in template) {
      if (Object.prototype.hasOwnProperty.call(template, key)) {
        newObj[key] = interpolate(template[key], context);
      }
    }
    return newObj as T;
  }

  return template;
}
