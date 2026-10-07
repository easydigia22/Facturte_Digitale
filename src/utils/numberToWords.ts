/**
 * Convertit un montant numérique en lettres en français standard (avec centimes).
 * Exemple: 15420.50 -> "Quinze mille quatre cent vingt Dirhams et cinquante centimes"
 */

const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'
];

const TENS = [
  '', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'
];

function convertBelowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 20) return UNITS[n];

  const tens = Math.floor(n / 10);
  const units = n % 10;

  if (tens === 7) {
    if (units === 1) return 'soixante-et-onze';
    return `soixante-${UNITS[10 + units]}`;
  }

  if (tens === 9) {
    return `quatre-vingt-${UNITS[10 + units]}`;
  }

  if (tens === 8) {
    if (units === 0) return 'quatre-vingts';
    return `quatre-vingt-${UNITS[units]}`;
  }

  if (units === 1 && tens > 1) {
    return `${TENS[tens]}-et-un`;
  }

  if (units > 0) {
    return `${TENS[tens]}-${UNITS[units]}`;
  }

  return TENS[tens];
}

function convertHundreds(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  let prefix = '';
  if (hundreds === 1) {
    prefix = 'cent';
  } else if (hundreds > 1) {
    prefix = `${UNITS[hundreds]} cent${rest === 0 ? 's' : ''}`;
  }

  const suffix = convertBelowThousand(rest);
  if (prefix && suffix) return `${prefix} ${suffix}`;
  return prefix || suffix;
}

export function numberToFrenchWords(num: number): string {
  if (num === 0) return 'zéro';
  if (num < 0) return `moins ${numberToFrenchWords(-num)}`;

  const rounded = Math.round(num * 100) / 100;
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100);

  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const rest = integerPart % 1000;

  const parts: string[] = [];

  if (billions > 0) {
    parts.push(billions === 1 ? 'un milliard' : `${convertHundreds(billions)} milliards`);
  }

  if (millions > 0) {
    parts.push(millions === 1 ? 'un million' : `${convertHundreds(millions)} millions`);
  }

  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : `${convertHundreds(thousands)} mille`);
  }

  if (rest > 0 || parts.length === 0) {
    const restStr = convertHundreds(rest);
    if (restStr) parts.push(restStr);
  }

  let result = parts.join(' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result;
}

export function amountToLegalWords(amount: number, currency: string = 'MAD'): string {
  const rounded = Math.round(amount * 100) / 100;
  const integerPart = Math.floor(rounded);
  const cents = Math.round((rounded - integerPart) * 100);

  let currencyName = 'Dirhams';
  let centName = 'centimes';

  if (currency === 'EUR') {
    currencyName = 'Euros';
    centName = 'centimes';
  } else if (currency === 'USD') {
    currencyName = 'Dollars';
    centName = 'cents';
  }

  const intWords = numberToFrenchWords(integerPart);
  
  if (cents > 0) {
    const centWords = numberToFrenchWords(cents).toLowerCase();
    return `${intWords} ${currencyName} et ${centWords} ${centName}`;
  }

  return `${intWords} ${currencyName}`;
}
