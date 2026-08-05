/**
 * Native CSV builder utility for operational exports.
 * Avoids heavy npm dependencies by properly escaping strings natively.
 */

export class CsvBuilder {
  /**
   * Generates a CSV string from an array of objects.
   * @param {Array<Object>} data - The dataset to export.
   * @param {Array<{header: string, key: string, transform?: Function}>} columns - The column definitions.
   * @returns {string} The formatted CSV string.
   */
  static build(data, columns) {
    if (!data || !data.length) {
      return columns.map(c => this.escape(c.header)).join(',') + '\n';
    }

    const headers = columns.map(c => this.escape(c.header)).join(',');

    const rows = data.map(row => {
      return columns.map(col => {
        let val = row[col.key];
        if (col.transform) {
          val = col.transform(val, row);
        }
        return this.escape(val);
      }).join(',');
    });

    return '\uFEFF' + [headers, ...rows].join('\n') + '\n';
  }

  /**
   * Escapes a value for safe inclusion in a CSV.
   * Handles nulls, quotes, commas, and newlines.
   * @param {any} value 
   * @returns {string}
   */
  static escape(value) {
    if (value === null || value === undefined) {
      return '';
    }

    let stringValue = String(value);

    // If string is an object representation (e.g. JSONB payload), stringify it
    if (typeof value === 'object' && value !== null) {
      if (value instanceof Date) {
        stringValue = value.toISOString();
      } else {
        try {
          stringValue = JSON.stringify(value);
        } catch (e) {
          stringValue = String(value);
        }
      }
    }

    // Escape double quotes by replacing " with ""
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
      stringValue = `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}
