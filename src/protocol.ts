import { frameSchema, Frame } from "./domain";
// NDJSON ASCII, fragmentable incluso con MTU 23. Nunca mezcla líneas parciales.
export class TelemetryDecoder {
  private buffer = "";
  private last = 0;
  push(chunk: string, now = Date.now()): Frame[] {
    if (now - this.last > 5000) this.buffer = "";
    this.last = now;
    this.buffer += chunk;
    if (this.buffer.length > 8192) {
      this.buffer = "";
      throw Error("Trama demasiado larga");
    }
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    return lines
      .filter((line) => line.trim())
      .map((line) => frameSchema.parse(JSON.parse(line)));
  }
}
