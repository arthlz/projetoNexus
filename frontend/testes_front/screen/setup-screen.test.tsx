import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupScreen } from '../../components/ui/screens/setup-screen';

// 1. Mock do useRouter do Next.js
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// 2. Mock do fetch global para não bater no back-end real
global.fetch = jest.fn();

describe('SetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve submeter o formulário com sucesso e redirecionar para a sala', async () => {
    // Simula a resposta 201 Created da API com os dados da sala
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ room_id: 123, status: 'success' }),
    });

    render(<SetupScreen />);
    
    const companyInput = screen.getByLabelText(/Empresa/i);
    await userEvent.type(companyInput, 'Nexus Inc');

    const submitButton = screen.getByRole('button', { name: /Iniciar/i });
    await userEvent.click(submitButton);

    // Verifica se a API foi chamada
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Verifica se fomos redirecionados para a tela de Call com o room_id retornado
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/call/123');
    });
  });

  it('deve mostrar erro se a API falhar', async () => {
    // Simula erro de validação (ex: 422 Unprocessable Entity)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Erro de validação' }),
    });

    render(<SetupScreen />);
    
    const submitButton = screen.getByRole('button', { name: /Iniciar/i });
    await userEvent.click(submitButton);


    expect(mockPush).not.toHaveBeenCalled(); // Não deve redirecionar
  });
});