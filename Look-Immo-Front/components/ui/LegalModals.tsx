import React from 'react';
import { X } from 'lucide-react';

const TermsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col animate-fade-in-up max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-100 bg-white z-10">
          <h2 className="text-2xl font-bold text-brand-dark font-serif">Conditions d’utilisation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Fermer" title="Fermer">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 text-gray-700 leading-relaxed custom-scrollbar">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
            <p className="font-medium text-lg text-brand-dark flex items-center gap-2">
              <span className="text-2xl">👋</span> En accédant au site Look Immo, vous acceptez pleinement les présentes conditions d’utilisation.
            </p>
          </div>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">🖥️</span> Utilisation du site
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              Le site a pour objectif de présenter des biens immobiliers et de faciliter la mise en relation entre utilisateurs et l’agence. Toute utilisation abusive, frauduleuse ou contraire à la loi est strictement interdite.
            </p>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">📸</span> Contenu
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              Les informations, images et annonces publiées sur le site sont fournies à titre indicatif. Look Immo ne garantit pas l’exactitude ou la disponibilité permanente des biens affichés.
            </p>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">⚠️</span> Responsabilité
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              Look Immo ne pourra être tenu responsable des interruptions du site, erreurs techniques ou dommages indirects liés à l’utilisation du site.
            </p>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">⚖️</span> Propriété intellectuelle
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              Tous les contenus du site (textes, images, logos, design) sont la propriété exclusive de Look Immo. Toute reproduction sans autorisation est interdite.
            </p>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">🔒</span> Données personnelles
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              L’utilisation du site implique l’acceptation de notre Politique de confidentialité.
            </p>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">📝</span> Modification des conditions
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              Look Immo se réserve le droit de modifier ces conditions à tout moment. Les nouvelles conditions s’appliquent dès leur publication.
            </p>
          </section>
        </div>

        <div className="p-8 pt-4 border-t border-gray-100 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="bg-brand-dark text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-teal transition shadow-lg transform hover:scale-105"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

const PrivacyModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col animate-fade-in-up max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-8 pb-4 border-b border-gray-100 bg-white z-10">
          <h2 className="text-2xl font-bold text-brand-dark font-serif">Politique de confidentialité</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition" aria-label="Fermer" title="Fermer">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 text-gray-700 leading-relaxed custom-scrollbar">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <p className="font-medium text-lg text-brand-dark flex items-center gap-2">
              <span className="text-2xl">🛡️</span> Chez Look Immo, nous respectons votre vie privée et protégeons vos données personnelles.
            </p>
          </div>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">📂</span> Données collectées
            </h3>
            <p className="text-sm font-semibold mb-2">Nous collectons uniquement les informations nécessaires telles que :</p>
            <ul className="list-disc pl-5 space-y-1 text-base text-gray-600 ml-[3.5rem]">
              <li>Nom, e-mail, téléphone</li>
              <li>Messages envoyés via les formulaires</li>
              <li>Informations liées aux biens immobiliers et aux rendez-vous</li>
              <li>Données de navigation (cookies, adresse IP)</li>
            </ul>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">⚙️</span> Utilisation des données
            </h3>
            <p className="text-sm font-semibold mb-2">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-5 space-y-1 text-base text-gray-600 ml-[3.5rem]">
              <li>Vous contacter et répondre à vos demandes</li>
              <li>Gérer les rendez-vous et services immobiliers</li>
              <li>Améliorer l’expérience utilisateur du site</li>
            </ul>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">🔒</span> Partage et sécurité
            </h3>
            <div className="text-base text-gray-600 pl-[3.5rem]">
              <p className="mb-2">Vos données ne sont jamais vendues.</p>
              <p>Elles sont accessibles uniquement par notre équipe et nos prestataires techniques autorisés. Des mesures de sécurité sont mises en place pour les protéger.</p>
            </div>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">🍪</span> Cookies
            </h3>
            <p className="text-base text-gray-600 pl-[3.5rem]">
              Le site utilise des cookies pour assurer son bon fonctionnement et améliorer la navigation. Vous pouvez les désactiver à tout moment depuis votre navigateur.
            </p>
          </section>

          <section className="bg-white hover:bg-gray-50 transition p-4 rounded-xl border border-transparent hover:border-gray-100">
            <h3 className="font-bold text-brand-dark text-xl mb-3 flex items-center gap-3">
              <span className="text-2xl bg-brand-light p-2 rounded-lg">⚖️</span> Vos droits
            </h3>
            <div className="text-base text-gray-600 pl-[3.5rem]">
              <p className="mb-2">Vous pouvez demander l’accès, la modification ou la suppression de vos données en nous contactant à :</p>
              <a href="mailto:contact@lookimmo.tn" className="text-brand-teal font-semibold hover:underline inline-flex items-center gap-2">
                📧 contact@lookimmo.tn
              </a>
            </div>
          </section>
        </div>

        <div className="p-8 pt-4 border-t border-gray-100 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="bg-brand-dark text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-teal transition shadow-lg transform hover:scale-105"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export { TermsModal, PrivacyModal };
