/**
 * cn — lightweight conditional className joiner.
 * Works like clsx: accepts strings, objects, arrays.
 * No external dependency needed.
 */
export function cn(...args) {
  return args
    .flatMap((arg) => {
      if (!arg) return [];
      if (typeof arg === "string") return [arg];
      if (Array.isArray(arg)) return [cn(...arg)];
      if (typeof arg === "object") {
        return Object.entries(arg)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k);
      }
      return [];
    })
    .filter(Boolean)
    .join(" ");
}
