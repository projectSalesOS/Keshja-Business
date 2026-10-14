import { describe, expect, it } from "vitest";
import { parseVoiceBooking } from "./voice-booking";
describe("Sprachbuchung", () => {
  it("erkennt eine Ausgabe mit Dezimalkomma", () => { expect(parseVoiceBooking("Ausgabe 49,90 Euro für Büromaterial")).toEqual({ type: "expense", amount: 49.9, description: "für Büromaterial" }); });
  it("erkennt Einnahmen", () => { expect(parseVoiceBooking("Einnahme 1200 Euro von Kunde").type).toBe("income"); });
  it("vermeidet mehrdeutige Beträge und Arten", () => { expect(parseVoiceBooking("Einnahme Ausgabe 20 und 30 Euro").type).toBeNull(); expect(parseVoiceBooking("20 Euro und 30 Euro").amount).toBeNull(); });
  it("lässt fehlende Angaben zur Korrektur frei", () => { expect(parseVoiceBooking("Büromaterial").amount).toBeNull(); expect(parseVoiceBooking("20 Euro").type).toBeNull(); });
});