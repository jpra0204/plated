/**
 * Parse a free-form ingredient string into quantity + name.
 *
 * @param text  The full text the user typed, e.g. "2 bananas" or "milk".
 * @returns
 * quantity: the leading number, or null if no number found  
 * name: the rest of the text, trimmed  
 */
export function parseIngredientText(text: string) {
    // Try to match a leading number (integer or decimal)
    const m = text.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  
    if (m) {
      const quantity = Number(m[1]);
      // Take the rest of the string as the name
      const name = m[2].trim() || "";
      return { quantity, name };
    } else {
      // no leading number → unitless item
      return { quantity: "-", name: text.trim() };
    }
  }