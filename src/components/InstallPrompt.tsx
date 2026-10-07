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
 * Ruling 2 : la clé est volontairement hors du préfixe `facturx:` pour
 * éviter l'effacement par le futur `LocalCache.purger()`.
 */
const CLE_REFUS = 'fx-install-dismissed';

export const InstallPrompt: React.FC = () => {
  const [invite, setInvite] = useState<BeforeInstallPromptEvent | null>(null);

  /**
   * Ruling 2 : tout accès à localStorage dans l'initialiseur d'un useState
   * doit être dans un try/catch. Un throw ici détruirait le rendu complet
   * de l'application. En cas d'échec (navigation privée, données bloquées),
   * on considère que le bandeau n'a pas encore été masqué.
   */
  const [refuse, setRefuse] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CLE_REFUS) === '1';
    } catch {
      return false;
    }
  });

  /**
   * Ruling 6 : état gérant l'échec du presse-papiers.
   * `null`      → aucune tentative de copie
   * `'copie'`   → copie réussie
   * `'echec'`   → copie impossible, on affiche le lien en texte sélectionnable
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
      localStorage.setItem(CLE_REFUS, '1');
    } catch {
      // Silencieux : setRefuse(true) ci-dessous cache le bandeau pour la session.
    }
    setRefuse(true);
  };

  const installer = async () => {
    if (!invite) return;
    try {
      await invite.prompt();
      const { outcome } = await invite.userChoice;
      if (outcome === 'accepted') setInvite(null);
    } catch {
      // L'invite a été rejetée ou le navigateur a refusé : le bandeau reste
      // visible pour permettre une nouvelle tentative.
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
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 print:hidden">
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
                  1. Touchez <Share size={14} className="inline" /> en bas de l'écran
                </li>
                <li>2. Faites défiler, puis « Sur l'écran d'accueil »</li>
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
