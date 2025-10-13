import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '@testing-library/react';
import Welcome from './Welcome';

// Mocks simples para isolar o componente
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/language-toggle', () => ({ LanguageToggle: () => null }));
vi.mock('@/components/buddy-logo', () => ({ BuddyLogo: () => null }));
vi.mock('@/components/role-card', () => ({
  RoleCard: (props: any) => (
    <button data-testid={`role-${props.title}`} onClick={props.onClick} />
  ),
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

beforeEach(() => {
  navigateMock.mockReset();
});

describe('Welcome page', () => {
  it('renders and navigates to auth on Get started', () => {
    render(<Welcome />);
    const btn = screen.getByRole('button', { name: /get started/i });
    fireEvent.click(btn);
    expect(navigateMock).toHaveBeenCalledWith('/auth', expect.any(Object));
  });
});

