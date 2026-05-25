import "@testing-library/jest-dom"
import { formatTime, cn } from "@/lib/utils"

describe("formatTime", () => {

  test("deve formatar 0 segundos como 00:00", () => {
    const entrada = 0
    const resultado = formatTime(entrada)
    expect(resultado).toBe("00:00")
  })

  test("deve formatar 60 segundos como 01:00", () => {
    const entrada = 60
    const resultado = formatTime(entrada)
    expect(resultado).toBe("01:00")
  })

  test("deve formatar 90 segundos como 01:30", () => {
    const entrada = 90
    const resultado = formatTime(entrada)
    expect(resultado).toBe("01:30")
  })

  test("deve formatar 9 segundos como 00:09 (zero à esquerda)", () => {
    const entrada = 9
    const resultado = formatTime(entrada)
    expect(resultado).toBe("00:09")
  })

})

describe("cn", () => {

  test("deve retornar uma classe simples", () => {
    const resultado = cn("text-white")
    expect(resultado).toBe("text-white")
  })

  test("deve mesclar duas classes sem conflito", () => {
    const resultado = cn("text-white", "bg-blue-500")
    expect(resultado).toBe("text-white bg-blue-500")
  })

  test("deve resolver conflito entre classes Tailwind", () => {
    const resultado = cn("text-red-500", "text-blue-500")
    expect(resultado).toBe("text-blue-500")
  })

})