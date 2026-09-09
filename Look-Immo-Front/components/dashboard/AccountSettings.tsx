import React from 'react';
import { User as UserIcon, Phone, ChevronRight, Edit } from 'lucide-react';
import { User } from '@/types';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useTranslation } from '@/hooks/useTranslation';

interface AccountSettingsProps {
  user: User;
  isEditing: boolean;
  formData: { name: string; email: string; phone: string };
  onSetEditing: (val: boolean) => void;
  onSetFormData: (data: { name: string; email: string; phone: string }) => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  isEditing,
  formData,
  onSetEditing,
  onSetFormData,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <ScrollReveal delay={300}>
      <div className="bg-white rounded-3xl shadow-soft border border-gray-100/80 p-6 sm:p-8 clean-ui-scope relative overflow-hidden mt-10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/5 rounded-bl-full -mr-8 -mt-8 pointer-events-none"></div>

      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
        <h2 className="text-xl font-serif font-bold text-brand-dark flex items-center">
          <UserIcon className="mr-3 text-brand-teal" size={24} />
          {t('accountSettingsTitle')}
        </h2>
        {!isEditing && (
          <button
            onClick={() => onSetEditing(true)}
            className="text-brand-teal hover:text-brand-dark font-bold text-sm flex items-center transition-colors gap-1.5"
            type="button"
          >
            <Edit size={16} /> {t('editAction')}
          </button>
        )}
      </div>

      <form onSubmit={onSave} className="space-y-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="group">
            <label htmlFor="account-fullname" className="text-xs font-bold text-gray-500 mb-2 flex items-center uppercase tracking-wider">
              <UserIcon size={14} className="mr-2 text-gray-400 group-focus-within:text-brand-teal transition-colors" />
              {t('accountFullNameLabel')}
            </label>
            <input
              id="account-fullname"
              type="text"
              value={formData.name}
              onChange={e => onSetFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              className={`w-full pl-4 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all duration-300 ${
                isEditing
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-gray-50/80 border-transparent text-gray-600 cursor-not-allowed'
              }`}
              placeholder={t('accountFullNamePlaceholder')}
            />
          </div>

          <div className="group">
            <label htmlFor="account-email" className="text-xs font-bold text-gray-500 mb-2 flex items-center uppercase tracking-wider">
              <span className="mr-2 text-gray-400 group-focus-within:text-brand-teal transition-colors">@</span>
              {t('accountEmailLabel')}
            </label>
            <input
              id="account-email"
              type="email"
              value={formData.email}
              onChange={e => onSetFormData({ ...formData, email: e.target.value })}
              disabled={!isEditing}
              className={`w-full pl-4 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all duration-300 ${
                isEditing
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-gray-50/80 border-transparent text-gray-600 cursor-not-allowed'
              }`}
              placeholder={t('accountEmailPlaceholder')}
            />
          </div>

          <div className="group">
            <label htmlFor="account-phone" className="text-xs font-bold text-gray-500 mb-2 flex items-center uppercase tracking-wider">
              <Phone size={14} className="mr-2 text-gray-400 group-focus-within:text-brand-teal transition-colors" />
              {t('accountPhoneLabel')}
            </label>
            <input
              id="account-phone"
              type="tel"
              value={formData.phone}
              onChange={e => {
                const val = e.target.value;
                if (/^[0-9+\s]*$/.test(val)) {
                  onSetFormData({ ...formData, phone: val });
                }
              }}
              disabled={!isEditing}
              className={`w-full pl-4 pr-4 py-3.5 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-teal/20 focus:border-brand-teal transition-all duration-300 ${
                isEditing
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-gray-50/80 border-transparent text-gray-600 cursor-not-allowed'
              }`}
              placeholder={t('accountPhonePlaceholder')}
            />
          </div>
        </div>

        {isEditing && (
          <div className="pt-4 flex justify-end space-x-4 animate-fade-in-up">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {t('cancelButton')}
            </button>
            <button
              type="submit"
              className="bg-brand-dark hover:bg-brand-primary text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 flex items-center shadow-brand-dark/10"
            >
              <span className="mr-2">{t('saveChangesButton')}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </form>
    </div>
    </ScrollReveal>
  );
};
