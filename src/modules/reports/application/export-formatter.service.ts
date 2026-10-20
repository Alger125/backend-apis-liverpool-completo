import { Injectable } from "@nestjs/common";

@Injectable()
export class ExportFormatterService {
  toCsv(items: Record<string, unknown>[], columns: string[]): string {
    const lines: string[] = [];

    // Header row
    lines.push(columns.map((c) => this.formatCsvField(c)).join(","));

    // Data rows
    for (const item of items) {
      const row = columns.map((col) => {
        const val = item[col];
        return this.formatCsvField(val);
      });
      lines.push(row.join(","));
    }

    return "\uFEFF" + lines.join("\r\n"); // UTF-8 BOM for Excel compatibility
  }

  toPipeDelimitedTxt(
    items: Record<string, unknown>[],
    columns: string[],
  ): string {
    const lines: string[] = [];

    // Header row
    lines.push(columns.join("|"));

    // Data rows
    for (const item of items) {
      const row = columns.map((col) => {
        const val = item[col];
        if (val === null || val === undefined) {
          return "";
        }
        if (typeof val === "boolean") {
          return val ? "1" : "0";
        }
        const str = String(val).replace(/\|/g, " ");
        return str.trim();
      });
      lines.push(row.join("|"));
    }

    return lines.join("\r\n");
  }

  private formatCsvField(val: unknown): string {
    if (val === null || val === undefined) {
      return '""';
    }

    if (typeof val === "boolean") {
      return val ? '"SÍ"' : '"NO"';
    }

    const str = String(val);

    // Preserve leading zeros for SAP codes (e.g. 0001)
    if (/^0\d+$/.test(str)) {
      return `="${str}"`;
    }

    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }
}
