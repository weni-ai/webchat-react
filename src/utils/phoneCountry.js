import { whereAlpha3 } from 'iso-3166-1';
import {
  AsYouType,
  getCountryCallingCode,
  isValidPhoneNumber,
} from 'libphonenumber-js/max';

import { getSegment } from '@/utils/vtexCustomFields';

const E164_MAX_DIGITS = 15;
const CALLING_CODE_MAX_DIGITS = 3;

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function isAlpha3(value) {
  return typeof value === 'string' && /^[A-Za-z]{3}$/.test(value);
}

function countryAlpha3FromRecord(record) {
  if (!record || typeof record !== 'object') return null;
  const code = record.countryCode ?? record.country;
  if (!isAlpha3(code)) return null;
  return String(code).toUpperCase();
}

function countryFromFastStoreSession() {
  try {
    const session = window.faststore_sdk_stores?.get('fs::session')?.read?.();
    return countryAlpha3FromRecord(session);
  } catch {
    return null;
  }
}

function countryFromSegmentToken() {
  try {
    const token = window.__RUNTIME__?.segmentToken;
    if (!token) return null;
    return countryAlpha3FromRecord(JSON.parse(atob(token)));
  } catch {
    return null;
  }
}

export function getStoreCountryAlpha3() {
  const runtimeCountry = window.__RUNTIME__?.culture?.country;
  if (isAlpha3(runtimeCountry)) return runtimeCountry.toUpperCase();

  return countryFromFastStoreSession() ?? countryFromSegmentToken();
}

export async function loadStoreCountryAlpha3() {
  const syncCountry = getStoreCountryAlpha3();
  if (syncCountry) return syncCountry;

  try {
    const segment = await getSegment();
    if (!segment) return null;
    return countryAlpha3FromRecord(JSON.parse(segment));
  } catch {
    return null;
  }
}

export function alpha2FromAlpha3(alpha3) {
  if (!isAlpha3(alpha3)) return null;
  return whereAlpha3(alpha3)?.alpha2 ?? null;
}

export function callingCodeForAlpha2(alpha2) {
  if (!alpha2) return null;
  try {
    return getCountryCallingCode(alpha2);
  } catch {
    return null;
  }
}

export function callingCodeDigits(value) {
  return digitsOnly(value).slice(0, CALLING_CODE_MAX_DIGITS);
}

export function nationalDigits(value, ddi) {
  const maxNational = Math.max(0, E164_MAX_DIGITS - digitsOnly(ddi).length);
  return digitsOnly(value).slice(0, maxNational);
}

export function formatNationalNumber(value, alpha2) {
  const digits = digitsOnly(value);
  if (!digits || !alpha2) return digits;
  try {
    return new AsYouType(alpha2).input(digits);
  } catch {
    return digits;
  }
}

export function isValidInternationalNumber(ddi, national) {
  const ddiDigits = digitsOnly(ddi);
  const nationalDigitsValue = digitsOnly(national);
  if (!ddiDigits || !nationalDigitsValue) return false;
  return isValidPhoneNumber(`+${ddiDigits}${nationalDigitsValue}`);
}

export function internationalDigits(ddi, national) {
  return `${digitsOnly(ddi)}${digitsOnly(national)}`;
}

export function phoneCountryFromAlpha3(alpha3) {
  const alpha2 = alpha2FromAlpha3(alpha3);
  const callingCode = callingCodeForAlpha2(alpha2);
  return {
    alpha2,
    ddi: callingCode ? `+${callingCode}` : '',
  };
}

export function readInitialPhoneCountry() {
  return phoneCountryFromAlpha3(getStoreCountryAlpha3());
}
