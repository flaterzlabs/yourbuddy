import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'en';

  const switchTo = current.startsWith('pt') ? 'en' : 'pt';
  const label = current.startsWith('pt') ? 'EN' : 'PT';

  return (
    <button
      onClick={() => i18n.changeLanguage(switchTo)}
      className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-accent"
      aria-label="Change language"
      title={current.startsWith('pt') ? 'Switch to English' : 'Mudar para Português'}
    >
      {label}
    </button>
  );
}
