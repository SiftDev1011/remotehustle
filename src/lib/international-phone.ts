import {
  parsePhoneNumberFromString,
  isSupportedCountry,
  type CountryCode,
} from "libphonenumber-js/min";
import countries from "./phone-countries.json";
export const PHONE_COUNTRIES = countries;
export function normalizeInternationalPhone(
  value: unknown,
  country: unknown = "NG",
): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (typeof country !== "string" || !isSupportedCountry(country))
    throw new Error("Select a country / dialling code.");
  if (!text || text.length > 40 || !/^\+?[0-9\s().-]+$/.test(text))
    throw new Error("Enter a valid phone number for the selected country.");
  const input = text.startsWith("00") ? "+" + text.slice(2) : text;
  const parsed = parsePhoneNumberFromString(input, {
    defaultCountry: country as CountryCode,
    extract: false,
  });
  if (!parsed || parsed.ext || !parsed.isPossible())
    throw new Error("Check the phone number and selected country code.");
  return parsed.number;
}
export function initialPhone(value: string) {
  const parsed = parsePhoneNumberFromString(value, {
    defaultCountry: "NG",
    extract: false,
  });
  return {
    country: parsed?.country || "NG",
    number: parsed?.country ? String(parsed.nationalNumber) : value,
  };
}
export function pastedPhoneCountry(value: string) {
  if (!value.trim().startsWith("+") && !value.trim().startsWith("00"))
    return undefined;
  const input = value.trim().replace(/^00/, "+");
  return parsePhoneNumberFromString(input, { extract: false })?.country;
}
