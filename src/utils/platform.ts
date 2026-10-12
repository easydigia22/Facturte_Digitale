/**
 * Détection de contexte navigateur et décision d'affichage du bandeau
 * d'installation.
 *
 * Tout est pur et sans effet de bord : l'appelant fournit le user-agent et
 * l'état observé. C'est ce qui rend ce parcours testable sans navigateur.
 */

/** Navigateurs intégrés à une application, incapables d'installer une PWA. */
const NAVIGATEURS_INTEGRES = [
  /WhatsApp/i,
  /FBAN|FBAV|FB_IAB/i, // Facebook, Messenger
  /Instagram/i,
  /Line\//i,
  /MicroMessenger/i, // WeChat
  /TikTok/i,
];

/**
 * `true` si la page tourne dans la vue embarquée d'une application.
 * Couvre aussi la WebView Android générique, repérable au jeton `; wv)`.
 */
export function isInAppBrowser(ua: string): boolean {
  if (!ua) return false;
  if (NAVIGATEURS_INTEGRES.some((motif) => motif.test(ua))) return true;
  return /;\s*wv\)/.test(ua);
}

/**
 * `true` si le user-agent désigne un appareil mobile.
 *
 * Sert uniquement à distinguer un téléphone d'un ordinateur de bureau : sur
 * mobile, tous les navigateurs offrent « Ajouter à l'écran d'accueil » dans
 * leur propre menu, même ceux qui n'émettent jamais `beforeinstallprompt`
 * (Firefox Android, Opera, navigateurs de surcouche constructeur).
 */
export function isMobile(ua: string): boolean {
  return /Android|Mobile/.test(ua);
}

/** `true` sur iPhone, iPad ou iPod. */
export function isIos(ua: string): boolean {
  return /iPad|iPhone|iPod/.test(ua);
}

export interface StandaloneProbe {
  /** `navigator.standalone`, propre à Safari iOS. */
  navigatorStandalone?: boolean;
  /** `window.matchMedia`, restreint à ce dont on a besoin. */
  matchMedia?: (query: string) => { matches: boolean };
}

/** `true` si l'application est lancée depuis l'écran d'accueil. */
export function isStandalone(probe: StandaloneProbe): boolean {
  if (probe.navigatorStandalone === true) return true;
  return probe.matchMedia?.('(display-mode: standalone)').matches === true;
}

export type InstallAdvice =
  /** Ne rien afficher. */
  | 'hidden'
  /** Un bouton déclenchant l'invite native du navigateur. */
  | 'prompt'
  /** La marche à suivre « Partager → Sur l'écran d'accueil ». */
  | 'ios-instructions'
  /** Inviter à rouvrir le lien dans un vrai navigateur. */
  | 'open-in-browser'
  /**
   * Renvoyer l'utilisateur vers le menu de son navigateur mobile.
   *
   * Cas des navigateurs mobiles qui n'émettent jamais `beforeinstallprompt`
   * (Firefox Android, Opera, surcouches constructeur) alors qu'ils proposent
   * tous « Ajouter à l'écran d'accueil ». Sans cette valeur, la personne à qui
   * l'on vient de demander de quitter WhatsApp pour son navigateur arrive sur
   * un écran muet : on l'a envoyée changer de navigateur pour installer, puis
   * on s'est tu.
   */
  | 'menu-instructions';

/**
 * Décide ce qu'il faut montrer. L'ordre des règles compte :
 *
 * 1. Déjà installée : plus rien à proposer, quel que soit le contexte.
 * 2. Vue embarquée : l'installation y est impossible, il faut en sortir —
 *    y compris sur iPhone, où les instructions d'ajout à l'écran d'accueil
 *    seraient inopérantes.
 * 3. Invite native disponible : c'est le chemin le plus court.
 * 4. iOS : aucune invite programmable, seules des instructions.
 * 5. Mobile sans invite native : renvoyer vers le menu du navigateur, qui
 *    propose toujours « Ajouter à l'écran d'accueil ».
 * 6. Sinon (bureau) : se taire plutôt que d'afficher un message inutile.
 */
export function installAdvice(ctx: {
  ua: string;
  standalone: boolean;
  promptAvailable: boolean;
}): InstallAdvice {
  if (ctx.standalone) return 'hidden';
  if (isInAppBrowser(ctx.ua)) return 'open-in-browser';
  if (ctx.promptAvailable) return 'prompt';
  if (isIos(ctx.ua)) return 'ios-instructions';
  if (isMobile(ctx.ua)) return 'menu-instructions';
  return 'hidden';
}
