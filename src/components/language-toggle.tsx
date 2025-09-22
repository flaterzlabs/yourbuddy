import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface LanguageToggleProps {
  trigger?: React.ReactNode;
}

export function LanguageToggle({ trigger }: LanguageToggleProps = {}) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || 'en';

  const switchTo = current.startsWith('pt') ? 'en' : 'pt';
  const label = current.startsWith('pt') ? 'EN' : 'PT';

  if (trigger) {
    return (
      <div
        onClick={() => i18n.changeLanguage(switchTo)}
        className="cursor-pointer"
        aria-label="Change language"
        title={current.startsWith('pt') ? 'Switch to English' : 'Mudar para Português'}
      >
        {trigger}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => i18n.changeLanguage(switchTo)}
      aria-label="Change language"
      title={current.startsWith('pt') ? 'Switch to English' : 'Mudar para Português'}
    >
      {label}
    </Button>
  );
}
