import "@testing-library/jest-dom"
import { render, screen, fireEvent } from "@testing-library/react"
import { LoginScreen } from "@/components/ui/screens/login-screen"

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}))

global.alert = jest.fn()
const mockNavigateTo = jest.fn()

describe("LoginScreen", () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("deve renderizar os campos de email e senha", () => {
    render(<LoginScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByPlaceholderText("seu@email.com")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument()
  })

  test("deve renderizar o botão Entrar", () => {
    render(<LoginScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Entrar")).toBeInTheDocument()
  })

  test("deve renderizar o link para cadastro", () => {
    render(<LoginScreen navigateTo={mockNavigateTo} />)
    expect(screen.getByText("Cadastre-se")).toBeInTheDocument()
  })

  test("deve navegar para register ao clicar em Cadastre-se", () => {
    render(<LoginScreen navigateTo={mockNavigateTo} />)
    fireEvent.click(screen.getByText("Cadastre-se"))
    expect(mockNavigateTo).toHaveBeenCalledWith("register")
  })

  test("deve atualizar o campo de email ao digitar", () => {
    render(<LoginScreen navigateTo={mockNavigateTo} />)
    const inputEmail = screen.getByPlaceholderText("seu@email.com")
    fireEvent.change(inputEmail, { target: { value: "teste@email.com" } })
    expect(inputEmail).toHaveValue("teste@email.com")
  })

  test("deve atualizar o campo de senha ao digitar", () => {
    render(<LoginScreen navigateTo={mockNavigateTo} />)
    const inputSenha = screen.getByPlaceholderText("••••••••")
    fireEvent.change(inputSenha, { target: { value: "123456" } })
    expect(inputSenha).toHaveValue("123456")
  })

})