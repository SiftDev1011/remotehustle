"use client";
import { useState } from "react";
import { Input, Select } from "./ui";
import {
  PHONE_COUNTRIES,
  initialPhone,
  pastedPhoneCountry,
} from "@/lib/international-phone";
export function PhoneField({
  initial = "",
  label = "Phone number",
  required = true,
}: {
  initial?: string;
  label?: string;
  required?: boolean;
}) {
  const [start] = useState(() => initialPhone(initial));
  const [country, setCountry] = useState<string>(start.country),
    [number, setNumber] = useState(start.number);
  return (
    <div className="app-phone-field">
      <Select
        name="phone_country"
        label="Phone country / dialling code"
        value={country}
        onChange={(e) => {
          setCountry(e.target.value);
          if (/^(\+|00)/.test(number.trim()))
            setNumber(initialPhone(number.trim().replace(/^00/, "+")).number);
        }}
        required={required}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.dialCode})
          </option>
        ))}
      </Select>
      <Input
        name="phone"
        label={label}
        type="tel"
        autoComplete="tel"
        required={required}
        maxLength={40}
        value={number}
        onChange={(e) => {
          const value = e.target.value;
          setNumber(value);
          const detected = pastedPhoneCountry(value);
          if (detected) setCountry(detected);
        }}
        aria-describedby="phone-help"
        placeholder="Enter phone number"
      />
      <p id="phone-help" className="rm-note app-phone-help">
        Choose the number’s country, then enter the local number. You can also
        paste a full number beginning with +.
      </p>
    </div>
  );
}
