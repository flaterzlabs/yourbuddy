import { ReactNode } from 'react';
import { render } from '@testing-library/react';

export function renderWithI18n(ui: ReactNode) {
  return render(ui);
}

