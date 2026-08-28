import React, { useState } from 'react';
import { navigate } from '../lib/router';
import { Download, ShieldCheck, Trash2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

/**
 * CHANTIER 9 (bloc A2) — Vos données (feature 43).
 *
 * Deux gestes, aucun e-mail à écrire au support :
 *  1. Exporter tout ce que KURLA détient sur soi (fichier JSON lisible).
 *  2. Supprimer son compte.
 *
 * On dit honnêtement ce qui survit : commandes, paiements, remboursements et
 * livraisons restent, parce que la loi impose de conserver ces pièces — pas
 * par commodité commerciale. Le reste part réellement.
 */
export default function PrivacyPage() {
  const { signOut } = useAuth();
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const exportData = async () => {
    setBusy('export');
    setMessage(null);
    try {
      const res = await fetch('/api/account/export', { credentials: 'include' });
      if (!res.ok) throw new Error('export_failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kurla-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ ok: true, text: 'Export téléchargé.' });
    } catch {
      setMessage({ ok: false, text: "L'export n'a pas abouti. Réessayez dans un instant." });
    } finally {
      setBusy(null);
    }
  };

  const deleteAccount = async () => {
    if (!confirmed) return;
    setBusy('delete');
    setMessage(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('delete_failed');
      setMessage({ ok: true, text: 'Votre compte a été supprimé.' });
      await signOut();
      navigate('/');
    } catch {
      setMessage({ ok: false, text: 'La suppression a échoué. Réessayez.' });
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-10 md:py-14">
      <header>
        <h1 className="font-display text-3xl font-bold">Vos données</h1>
        <p className="mt-2 text-sm text-surface-500">
          Ce que KURLA détient sur vous, et deux gestes pour en reprendre le contrôle.
        </p>
      </header>

      {message ? (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.ok ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <section className="rounded-2xl border border-surface-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Download className="h-5 w-5 text-brand-500" aria-hidden="true" />
          Exporter mes données
        </h2>
        <p className="mt-2 text-sm text-surface-600">
          Un fichier JSON contenant votre profil, vos photos, votre historique, votre étagère,
          vos routines, vos résultats, vos conversations IA, votre fidélité, vos articles, votre
          famille et vos demandes au support.
        </p>
        <button
          type="button"
          onClick={exportData}
          disabled={busy !== null}
          className="mt-4 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busy === 'export' ? 'Préparation…' : 'Télécharger mon export'}
        </button>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-rose-700">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          Supprimer mon compte
        </h2>

        <div className="mt-4 space-y-3 text-sm text-surface-600">
          <p>
            <strong className="text-surface-800">Ce qui part :</strong> profil, photos,
            historique, étagère, routines adaptatives, résultats, conversations IA, fidélité,
            famille, avis, préférences, adresses, notifications, demandes de support — puis le
            compte de connexion lui-même.
          </p>
          <p>
            <strong className="text-surface-800">Ce qui est conservé :</strong> commandes,
            paiements, remboursements et livraisons. Ces pièces comptables et fiscales doivent
            être conservées par la loi ; ce ne sont pas des données marketing, et elles ne
            peuvent pas être effacées à la demande.
          </p>
        </div>

        <label className="mt-4 flex items-start gap-2 text-sm text-surface-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={event => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          <span>Je comprends que cette suppression est définitive.</span>
        </label>

        <button
          type="button"
          onClick={deleteAccount}
          disabled={!confirmed || busy !== null}
          className="mt-4 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === 'delete' ? 'Suppression…' : 'Supprimer définitivement mon compte'}
        </button>
      </section>

      <p className="flex items-start gap-2 text-xs text-surface-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Ces deux actions n&apos;agissent que sur votre propre compte, avec votre propre session.
        Aucun autre compte n&apos;est accessible depuis cette page.
      </p>
    </div>
  );
}
