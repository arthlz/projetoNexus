import { render, screen } from '@testing-library/react';
import { ReportScreen } from '../../components/ui/screens/report-screen';
import { defaultReport } from '../../constants/mock-data'; // Usando os mocks existentes

describe('ReportScreen', () => {
  it('deve renderizar as pontuações gerais corretamente', () => {
    // Renderizamos passando uma propriedade ou mockando a chamada de API
    // Assumindo que a tela pode receber os dados iniciais por props ou via hook
    render(<ReportScreen reportData={defaultReport} />);

    // Verifica se o título da vaga está presente
    expect(screen.getByText(defaultReport.role)).toBeInTheDocument();
    expect(screen.getByText(defaultReport.company)).toBeInTheDocument();

    // Verifica se as notas aparecem (pode ser necessário procurar por Regex dependendo de como está no DOM)
    // Se a nota técnica for 85, esperamos que o número apareça na tela
    expect(screen.getByText(new RegExp(`${defaultReport.tech}`, 'i'))).toBeInTheDocument();
  });

  it('deve renderizar o histórico da transcrição', () => {
    render(<ReportScreen reportData={defaultReport} />);
    
    // Verifica se a primeira mensagem do entrevistador aparece
    const msgEntrevistador = defaultReport.messages[0].text;
    expect(screen.getByText(msgEntrevistador)).toBeInTheDocument();
  });
});