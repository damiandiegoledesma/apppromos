/**
 * AppPromos V11.4.1 — Normalización de alta
 *
 * Objetivo: que los datos comerciales nazcan limpios desde registro/admin.
 * No reemplaza al PromosDepurador futuro: evita seguir generando datos sucios.
 */

import { getPhoneKey, normalizeSlug } from "./web-premium-service.js";

export function normalizePhoneAR(input = "") {
  const rawPhone = String(input || "").trim();
  let digits = rawPhone.replace(/\D/g, "");

  digits = digits.replace(/^00+/, "");

  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9") && digits.length === 11) digits = digits.slice(1);
  digits = digits.replace(/^0+/, "");

  if (digits.startsWith("11")) {
    let rest = digits.slice(2);
    if (rest.startsWith("15")) rest = rest.slice(2);
    digits = "11" + rest;
  } else if (digits.length >= 10) {
    let area = digits.slice(0, 4);
    let rest = digits.slice(4);
    if (rest.startsWith("15")) rest = rest.slice(2);
    digits = area + rest;
  }

  const phoneKey = getPhoneKey(digits);
  if (phoneKey.length < 8) {
    return {
      rawPhone,
      phone: "",
      phoneE164: "",
      phoneKey: "",
      isValid: false
    };
  }

  const phoneE164 = phoneKey.length === 10 ? `+549${phoneKey}` : `+54${phoneKey}`;

  return {
    rawPhone,
    phone: phoneE164,
    phoneE164,
    phoneKey,
    isValid: true
  };
}

export function normalizeLocalityKey(locality = "", province = "") {
  return normalizeSlug(`${locality || ""}-${province || ""}`);
}

export function normalizeGeoInput(data = {}) {
  const locality = String(data.locality || data.localidad || data.ciudad || "").trim();
  const province = String(data.province || data.provincia || "").trim();
  const provinceId = String(data.provinceId || data.provinciaId || "").trim();
  const address = String(data.address || data.direccion || "").trim();

  return {
    address,
    direccion: address,
    locality,
    ciudad: locality,
    localityKey: data.localityKey || normalizeLocalityKey(locality, province),
    province,
    provincia: province,
    provinceId
  };
}

export function buildBusinessIdentity(data = {}) {
  const phone = normalizePhoneAR(data.telefono || data.phone || "");
  const geo = normalizeGeoInput(data);

  return {
    ...geo,
    rawPhone: phone.rawPhone,
    phone: phone.phone,
    phoneE164: phone.phoneE164,
    phoneKey: phone.phoneKey,
    telefono: phone.phone,
    isValidPhone: phone.isValid
  };
}
