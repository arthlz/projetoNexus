import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { HistoryScreen } from "@/components/ui/screens/history-screen"
import { mockHistory } from "@/constants/mock-data"

const mockOnItemClick = jest.fn()

describe("HistoryScreen", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("deve renderizar o título da tela", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    expect(screen.getByText("Histórico de Entrevistas")).toBeInTheDocument()
  })

  test("deve renderizar todos os itens do histórico", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    expect(screen.getByText("Nubank - Front-end Sênior")).toBeInTheDocument()
    expect(screen.getByText("Itaú - Back-end Pleno")).toBeInTheDocument()
    expect(screen.getByText("Mercado Livre - Fullstack Júnior")).toBeInTheDocument()
  })

  test("deve renderizar as datas de cada entrevista", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    expect(screen.getByText("10 Out 2026")).toBeInTheDocument()
    expect(screen.getByText("05 Out 2026")).toBeInTheDocument()
    expect(screen.getByText("01 Out 2026")).toBeInTheDocument()
  })

  test("deve renderizar os scores de cada entrevista", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    expect(screen.getByText("92")).toBeInTheDocument()
    expect(screen.getByText("78")).toBeInTheDocument()
    expect(screen.getByText("65")).toBeInTheDocument()
  })

  test("deve chamar onItemClick ao clicar em um item", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    fireEvent.click(screen.getByText("Nubank - Front-end Sênior"))
    expect(mockOnItemClick).toHaveBeenCalledWith(mockHistory[0])
  })

  test("deve chamar onItemClick com o item correto ao clicar", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    fireEvent.click(screen.getByText("Itaú - Back-end Pleno"))
    expect(mockOnItemClick).toHaveBeenCalledWith(mockHistory[1])
  })

  test("deve renderizar o número correto de itens", () => {
    render(<HistoryScreen onItemClick={mockOnItemClick} />)
    const scores = mockHistory.map((i) => screen.getByText(i.score.toString()))
    expect(scores.length).toBe(mockHistory.length)
  })

})