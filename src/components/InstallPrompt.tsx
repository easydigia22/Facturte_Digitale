// src/components/InstallPrompt.tsx
import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { installAdvice, isStandalone, type InstallAdvice } from '../utils/platform';

/** Événement non standard, absent des types du DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * `window` augmenté de la cache posée par le script en ligne d'`index.html`.
 * Déclaré ici plutôt qu'en `any` pour garder le typage de l'événement.
 */
interface FenetreAvecInvite {
  __fxInstallPrompt?: BeforeInstallPromptEvent;
}

/**
 * Chrome peut émettre `beforeinstallprompt` avant que React n'ait monté son
 * écouteur : lors d'une visite répétée, le service worker est déjà actif et le
 * manifeste déjà lu. Un script en ligne d'`index.html`, placé avant le module,
 * capture l'événement et le dépose sur `window`. On le récupère ici, en plus
 * de l'abonnement classique, sinon le bandeau resterait invisible toute la
 * session sur le chemin d'installation principal (Chrome Android).
 */
function lireInviteCapturee(): BeforeInstallPromptEvent | null {
  try {
    return (window as unknown as FenetreAvecInvite).__fxInstallPrompt ?? null;
  } catch {
    return null;
  }
}

/** Efface la cache une fois l'événement consommé : il n'est plus utilisable. */
function oublierInviteCapturee(): void {
  try {
    delete (window as unknown as FenetreAvecInvite).__fxInstallPrompt;
  } catch {
    // Silencieux : au pire l'événement périmé est réutilisé après un remontage,
    // et `installer()` le libérera de nouveau au premier appui.
  }
}

/**
 * Ruling 2 : la clé est volontairement hors du préfixe `facturx:` pour
 * éviter l'effacement par le futur `LocalCache.purger()`.
 */
const CLE_REFUS = 'fx-install-dismissed';

/**
 * Un refus n'est pas définitif : une personne qui touche la croix par réflexe
 * — le réflexe le plus probable face à une barre qui couvre son contenu —
 * perdrait sinon tout accès à l'installation dans ce navigateur, car rien
 * d'autre dans l'application ne la propose. On repropose au bout de 14 jours.
 */
const DUREE_REFUS_MS = 14 * 24 * 60 * 60 * 1000;

export const InstallPrompt: React.FC = () => {
  const [invite, setInvite] = useState<BeforeInstallPromptEvent | null>(() =>
    lireInviteCapturee()
  );

  /**
   * Ruling 2 : tout accès à localStorage dans l'initialiseur d'un useState
   * doit être dans un try/catch. Un throw ici détruirait le rendu complet
   * de l'application. En cas d'échec (navigation privée, données bloquées),
   * on considère que le bandeau n'a pas encore été masqué.
   *
   * La valeur stockée est un horodatage. Toute valeur illisible — y compris
   * l'ancien `'1'`, qui se lit comme une date de 1970 donc expirée — est
   * traitée comme « pas de refus », jamais comme un refus perpétuel.
   */
  const [refuse, setRefuse] = useState<boolean>(() => {
    try {
      const brut = localStorage.getItem(CLE_REFUS);
      if (!brut) return false;
      const horodatage = Number.parseInt(brut, 10);
      if (!Number.isFinite(horodatage)) return false;
      return Date.now() - horodatage < DUREE_REFUS_MS;
    } catch {
      return false;
    }
  });

  /**
   * Ruling 6 : état gérant l'échec du presse-papiers.
   * `null`      → aucune tentative de copie
   * `'copie'`   → copie réussie
   * `'echec'`   → copie impossible, on affiche le lien en texte sélectionnable
   *
   * Aucune remise à zéro n'est nécessaire quand `conseil` change : `'echec'`
   * n'est posé que par `copierLien`, lui-même rendu uniquement sous
   * `open-in-browser`, état dérivé d'un user-agent fixe pour toute la vie de
   * la page — `conseil` ne peut donc pas quitter `open-in-browser` tant que ce
   * composant est monté. Si un lot ultérieur ajoute une source de re-rendu qui
   * peut faire varier `conseil`, il faudra réinitialiser `etatCopie`.
   */
  const [etatCopie, setEtatCopie] = useState<null | 'copie' | 'echec'>(null);

  useEffect(() => {
    const surInvite = (event: Event) => {
      // Empêche l'invite spontanée du navigateur : on la déclenche nous-mêmes,
      // au moment où l'utilisateur appuie sur notre bouton.
      event.preventDefault();
      setInvite(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', surInvite);
    return () => window.removeEventListener('beforeinstallprompt', surInvite);
  }, []);

  const conseil: InstallAdvice = installAdvice({
    ua: navigator.userAgent,
    standalone: isStandalone({
      navigatorStandalone: (navigator as { standalone?: boolean }).standalone,
      matchMedia: (q) => window.matchMedia(q),
    }),
    promptAvailable: invite !== null,
  });

  if (conseil === 'hidden' || refuse) return null;

  const masquer = () => {
    /**
     * Ruling 2 : l'écriture dans localStorage peut échouer (navigation privée,
     * quota dépassé). On n'interrompt pas le flux : le bandeau est tout de
     * même masqué pour la session courante via `setRefuse`.
     */
    try {
      localStorage.setItem(CLE_REFUS, String(Date.now()));
    } catch {
      // Silencieux : setRefuse(true) ci-dessous cache le bandeau pour la session.
    }
    setRefuse(true);
  };

  const installer = async () => {
    if (!invite) return;
    /**
     * Un événement `beforeinstallprompt` ne peut être `prompt()`é qu'une fois :
     * un second appel rejette avec `InvalidStateError`. On libère donc
     * l'événement dans tous les cas, succès comme refus comme échec. Le bandeau
     * retombe sur le conseil suivant et Chrome réémet l'événement au
     * chargement suivant : rien n'est perdu, et le bouton ne peut jamais être
     * touché deux fois dans le vide.
     */
    try {
      await invite.prompt();
      await invite.userChoice;
    } catch {
      // Invite refusée par le navigateur : l'événement est consommé malgré tout.
    } finally {
      setInvite(null);
      oublierInviteCapturee();
    }
  };

  /**
   * Ruling 6 : l'API Clipboard échoue fréquemment dans les navigateurs
   * intégrés (WhatsApp, etc.) et dans les contextes non sécurisés. Or
   * `open-in-browser` est précisément affiché quand l'utilisateur est bloqué
   * dans un tel contexte. Un rejet non géré le laisserait sans recours.
   * En cas d'échec, on bascule vers l'affichage du lien en texte sélectionnable.
   */
  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setEtatCopie('copie');
      setTimeout(() => setEtatCopie(null), 2500);
    } catch {
      setEtatCopie('echec');
    }
  };

  return (
    /**
     * `z-40` et non `z-50` : les fenêtres modales (assistant IA, guide
     * d'utilisation, création rapide de client) sont en `fixed inset-0 z-50`.
     * À z-index égal, ce bandeau — dernier enfant du conteneur racine — passait
     * par-dessus elles et couvrait, sur téléphone, la zone de saisie et le
     * bouton d'envoi de l'assistant IA.
     */
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 print:hidden">
      <div className="mx-auto flex max-w-xl items-start gap-3 rounded-2xl bg-indigo-600 p-4 text-white shadow-2xl">
        <div className="min-w-0 flex-1">
          {conseil === 'prompt' && (
            <>
              <p className="font-semibold">Installer FacturX sur votre appareil</p>
              <p className="mt-0.5 text-sm text-indigo-100">
                Accès direct depuis l'écran d'accueil, sans barre d'adresse.
              </p>
              <button
                onClick={installer}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700"
              >
                <Download size={16} /> Installer l'application
              </button>
            </>
          )}

          {conseil === 'open-in-browser' && (
            <>
              <p className="font-semibold">Ouvrez ce lien dans votre navigateur</p>
              <p className="mt-0.5 text-sm text-indigo-100">
                L'installation n'est pas possible depuis WhatsApp. Touchez le menu
                <span className="font-semibold"> ⋮ </span>
                puis « Ouvrir dans le navigateur », ou copiez le lien et collez-le dans Chrome.
              </p>

              {/* Ruling 6 : fallback lorsque le presse-papiers n'est pas disponible */}
              {etatCopie === 'echec' ? (
                <div className="mt-3">
                  <p className="text-xs text-indigo-100">
                    Copie automatique impossible. Sélectionnez et copiez l'adresse :
                  </p>
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="mt-1 w-full select-all rounded-lg bg-indigo-800 px-3 py-2 text-xs text-white"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                </div>
              ) : (
                <button
                  onClick={copierLien}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700"
                >
                  {etatCopie === 'copie' ? 'Lien copié ✓' : 'Copier le lien'}
                </button>
              )}
            </>
          )}

          {conseil === 'ios-instructions' && (
            <>
              <p className="font-semibold">Ajouter FacturX à votre écran d'accueil</p>
              <ol className="mt-1 space-y-1 text-sm text-indigo-100">
                <li className="flex items-center gap-1.5">
                  1. Touchez le bouton Partager
                  <Share size={14} className="inline" aria-hidden="true" />
                </li>
                <li>2. Faites défiler, puis « Sur l'écran d'accueil »</li>
                <li>3. Confirmez par « Ajouter »</li>
              </ol>
            </>
          )}

          {/*
            Navigateurs mobiles qui n'émettent jamais `beforeinstallprompt`
            (Firefox Android, Opera, surcouches constructeur) : ils proposent
            tous l'ajout à l'écran d'accueil, mais seulement depuis leur menu.
          */}
          {conseil === 'menu-instructions' && (
            <>
              <p className="font-semibold">Ajouter FacturX à votre écran d'accueil</p>
              <ol className="mt-1 space-y-1 text-sm text-indigo-100">
                <li>1. Ouvrez le menu de votre navigateur (⋮ ou ☰)</li>
                <li>2. Choisissez « Ajouter à l'écran d'accueil »</li>
                <li>3. Confirmez par « Ajouter »</li>
              </ol>
            </>
          )}
        </div>

        <button
          onClick={masquer}
          aria-label="Masquer ce message"
          className="rounded-lg p-1 text-indigo-200 hover:bg-indigo-500 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
