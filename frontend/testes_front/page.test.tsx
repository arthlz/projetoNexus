import { render, screen } from '@testing-library/react';
import Page from '../app/page';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

// Mock do useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('Home Page', () => {
  it('renderiza a página principal sem erros', () => {
    render(<Page />);
      
    // Verificação genérica para garantir que o container foi gerado
    const container = screen.getAllByRole('generic')[0];
    expect(container).toBeInTheDocument();
  });
});