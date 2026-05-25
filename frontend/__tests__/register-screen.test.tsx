import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { RegisterScreen } from "@/components/ui/screens/register-screen"

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
    },
  },
}))

global.alert = jest.fn()
const mockNavigateTo = jest.fn()

describe("RegisterScreen", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("deve renderizar os campos de nome, email e senha", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByPlaceholderText("Nome")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("E-mail")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Senha")).toBeInTheDocument()
  })

  test("deve renderizar o botão Criar conta", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Criar conta")).toBeInTheDocument()
  })

  test("deve renderizar o link para login", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Entrar")).toBeInTheDocument()
  })

  test("deve navegar para login ao clicar em Entrar", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Entrar"))
    expect(mockNavigateTo).toHaveBeenCalledWith("login")
  })

  test("deve atualizar o campo nome ao digitar", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    const inputNome = screen.getByPlaceholderText("Nome")
    fireEvent.change(inputNome, { target: { value: "João Silva" } })
    expect(inputNome).toHaveValue("João Silva")
  })

  test("deve atualizar o campo email ao digitar", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    const inputEmail = screen.getByPlaceholderText("E-mail")
    fireEvent.change(inputEmail, { target: { value: "joao@email.com" } })
    expect(inputEmail).toHaveValue("joao@email.com")
  })

  test("deve atualizar o campo senha ao digitar", () => {
    render(<RegisterScreen navigateTo={mockNavigateTo} />)
    const inputSenha = screen.getByPlaceholderText("Senha")
    fireEvent.change(inputSenha, { target: { value: "senha123" } })
    expect(inputSenha).toHaveValue("senha123")
  })

})