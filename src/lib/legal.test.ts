import { describe, expect, it } from "vitest";
import { legalDetailsSchema, missingLegalFields } from "./legal";
describe("legal settings rules", () => {
 it("marks missing operator identity as required", () => {
   expect(missingLegalFields({ company_name: "Test" }).some(([key]) => key === "operator_name")).toBe(true);
 });
 it("accepts partial data without inventing missing values", () => {
   expect(legalDetailsSchema.parse({ company_name: "Test" })).toEqual({ company_name: "Test" });
 });
 it("rejects malformed public contact", () => {
   expect(legalDetailsSchema.safeParse({ email: "invalid" }).success).toBe(false);
 });
 it("rejects unexpected privilege fields", () => {
   expect(legalDetailsSchema.safeParse({ role: "admin" }).success).toBe(false);
 });
});