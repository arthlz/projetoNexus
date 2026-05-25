import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { DashboardScreen } from "@/components/ui/screens/dashboard-screen"
import { mockHistory } from "@/constants/mock-data"

const mockNavigateTo = jest.fn()

describe("DashboardScreen", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("deve renderizar a mensagem de boas-vindas", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Bem-vindo de volta!")).toBeInTheDocument()
  })

  test("deve renderizar o card de Iniciar Simulação", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Iniciar Simulação")).toBeInTheDocument()
  })

  test("deve renderizar o card de Testar ATS", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Testar ATS")).toBeInTheDocument()
  })

  test("deve navegar para setup ao clicar em Iniciar Simulação", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Iniciar Simulação").closest("div")!.parentElement!.parentElement!)
    expect(mockNavigateTo).toHaveBeenCalledWith("setup")
  })

  test("deve navegar para resume ao clicar em Testar ATS", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Testar ATS").closest("div")!.parentElement!.parentElement!)
    expect(mockNavigateTo).toHaveBeenCalledWith("resume")
  })

  test("deve exibir o número correto de entrevistas", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText(mockHistory.length.toString())).toBeInTheDocument()
  })

  test("deve exibir a média geral correta", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    const media = Math.round(mockHistory.reduce((acc, i) => acc + i.score, 0) / mockHistory.length)
    const elementos = screen.getAllByText(`${media}%`)
    expect(elementos.length).toBeGreaterThan(0)
  })

  test("deve exibir o melhor score corretamente", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    const melhor = Math.max(...mockHistory.map((i) => i.score))
    const elementos = screen.getAllByText(`${melhor}%`)
    expect(elementos.length).toBeGreaterThan(0)
  })

  test("deve exibir as empresas do histórico", () => {
    render(<DashboardScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Nubank")).toBeInTheDocument()
    expect(screen.getByText("Itaú")).toBeInTheDocument()
    expect(screen.getByText("Mercado Livre")).toBeInTheDocument()
  })

})