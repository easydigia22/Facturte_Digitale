import { describe, expect, it } from 'vitest';
import {
  installAdvice,
  isInAppBrowser,
  isIos,
  isStandalone,
} from '../src/utils/platform';

const UA = {
  whatsappAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A135F; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36 WhatsApp/2.23',
  whatsappIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.23',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  firefoxAndroid:
    'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
  operaMiniAndroid:
    'Mozilla/5.0 (Linux; Android 10; SM-A105F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36 OPR/76.0.0.0',
  firefoxDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
};

describe('isInAppBrowser', () => {
  it('reconnaît WhatsApp sur Android', () => {
    expect(isInAppBrowser(UA.whatsappAndroid)).toBe(true);
  });

  it('reconnaît WhatsApp sur iPhone', () => {
    expect(isInAppBrowser(UA.whatsappIphone)).toBe(true);
  });

  it('ne signale pas Chrome Android', () => {
    expect(isInAppBrowser(UA.chromeAndroid)).toBe(false);
  });

  it('ne signale pas Safari iOS', () => {
    expect(isInAppBrowser(UA.safariIphone)).toBe(false);
  });

  it('tolère un user-agent vide', () => {
    expect(isInAppBrowser('')).toBe(false);
  });
});

describe('isIos', () => {
  it('reconnaît un iPhone', () => {
    expect(isIos(UA.safariIphone)).toBe(true);
  });

  it('ne reconnaît pas Android', () => {
    expect(isIos(UA.chromeAndroid)).toBe(false);
  });
});

describe('isStandalone', () => {
  it('détecte le mode autonome iOS', () => {
    expect(isStandalone({ navigatorStandalone: true })).toBe(true);
  });

  it('détecte le mode autonome via display-mode', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: true }) })).toBe(true);
  });

  it('renvoie faux dans un onglet ordinaire', () => {
    expect(isStandalone({ matchMedia: () => ({ matches: false }) })).toBe(false);
  });

  it("renvoie faux quand aucune sonde n'est disponible", () => {
    expect(isStandalone({})).toBe(false);
  });
});

describe('installAdvice', () => {
  it("masque tout quand l'application est déjà installée", () => {
    expect(
      installAdvice({ ua: UA.chromeAndroid, standalone: true, promptAvailable: true })
    ).toBe('hidden');
  });

  it("masque tout même si l'app installée est rouverte depuis WhatsApp", () => {
    expect(
      installAdvice({ ua: UA.whatsappAndroid, standalone: true, promptAvailable: false })
    ).toBe('hidden');
  });

  it("demande d'ouvrir dans le navigateur depuis WhatsApp Android", () => {
    expect(
      installAdvice({ ua: UA.whatsappAndroid, standalone: false, promptAvailable: false })
    ).toBe('open-in-browser');
  });

  it("demande d'ouvrir dans le navigateur depuis WhatsApp iPhone, pas les instructions iOS", () => {
    expect(
      installAdvice({ ua: UA.whatsappIphone, standalone: false, promptAvailable: false })
    ).toBe('open-in-browser');
  });

  it('propose l\'installation native quand le navigateur le permet', () => {
    expect(
      installAdvice({ ua: UA.chromeAndroid, standalone: false, promptAvailable: true })
    ).toBe('prompt');
  });

  it('affiche les instructions sur Safari iOS', () => {
    expect(
      installAdvice({ ua: UA.safariIphone, standalone: false, promptAvailable: false })
    ).toBe('ios-instructions');
  });

  it("renvoie les instructions de menu sur Firefox Android, qui n'émet jamais beforeinstallprompt", () => {
    expect(
      installAdvice({ ua: UA.firefoxAndroid, standalone: false, promptAvailable: false })
    ).toBe('menu-instructions');
  });

  it('renvoie les instructions de menu sur Opera Mobile sans invite disponible', () => {
    expect(
      installAdvice({ ua: UA.operaMiniAndroid, standalone: false, promptAvailable: false })
    ).toBe('menu-instructions');
  });

  it("ne renvoie pas les instructions de menu quand l'invite native est disponible", () => {
    expect(
      installAdvice({ ua: UA.firefoxAndroid, standalone: false, promptAvailable: true })
    ).toBe('prompt');
  });

  it('reste masqué sur Firefox de bureau, où le bandeau ne sert à rien', () => {
    expect(
      installAdvice({ ua: UA.firefoxDesktop, standalone: false, promptAvailable: false })
    ).toBe('hidden');
  });

  it('reste masqué sur un navigateur de bureau sans invite disponible', () => {
    expect(
      installAdvice({ ua: UA.chromeDesktop, standalone: false, promptAvailable: false })
    ).toBe('hidden');
  });

  it('reste masqué pour un user-agent vide', () => {
    expect(installAdvice({ ua: '', standalone: false, promptAvailable: false })).toBe(
      'hidden'
    );
  });
});
