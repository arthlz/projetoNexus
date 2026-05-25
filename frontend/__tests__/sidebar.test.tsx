import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { Sidebar } from "@/components/ui/layout/sidebar"

const mockNavigateTo = jest.fn()

describe("Sidebar", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("deve renderizar o logo Nexus", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Nexus")).toBeInTheDocument()
  })

  test("deve renderizar todos os itens de navegação", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Início")).toBeInTheDocument()
    expect(screen.getByText("Nova Entrevista")).toBeInTheDocument()
    expect(screen.getByText("Análise de Currículo")).toBeInTheDocument()
    expect(screen.getByText("Histórico")).toBeInTheDocument()
    expect(screen.getByText("Meu Perfil")).toBeInTheDocument()
  })

  test("deve renderizar o botão de sair", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Sair")).toBeInTheDocument()
  })

  test("deve navegar para setup ao clicar em Nova Entrevista", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Nova Entrevista"))
    expect(mockNavigateTo).toHaveBeenCalledWith("setup")
  })

  test("deve navegar para history ao clicar em Histórico", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Histórico"))
    expect(mockNavigateTo).toHaveBeenCalledWith("history")
  })

  test("deve navegar para profile ao clicar em Meu Perfil", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Meu Perfil"))
    expect(mockNavigateTo).toHaveBeenCalledWith("profile")
  })

  test("deve destacar o item ativo", () => {
    render(<Sidebar currentScreen="history" navigateTo={mockNavigateTo} />)
    const botaoHistorico = screen.getByText("Histórico").closest("button")
    expect(botaoHistorico).toHaveClass("text-cyan-400")
  })

  test("deve não destacar itens inativos", () => {
    render(<Sidebar currentScreen="dashboard" navigateTo={mockNavigateTo} />)
    const botaoHistorico = screen.getByText("Histórico").closest("button")
    expect(botaoHistorico).toHaveClass("text-slate-300")
  })

})