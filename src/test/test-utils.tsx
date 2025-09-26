import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

export function renderWithI18n(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
}