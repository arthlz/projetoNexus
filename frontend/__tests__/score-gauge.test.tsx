import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { ScoreGauge } from "@/components/ui/layout/score-gauge"

describe("ScoreGauge", () => {

  test("deve renderizar a pontuação passada como prop", () => {
    render(<ScoreGauge score={75} />)
    expect(screen.getByText("75")).toBeInTheDocument()
  })

  test("deve renderizar o texto /100", () => {
    render(<ScoreGauge score={75} />)
    expect(screen.getByText("/100")).toBeInTheDocument()
  })

  test("deve usar cor verde para score >= 80", () => {
    const { container } = render(<ScoreGauge score={80} />)
    const circles = container.querySelectorAll("circle")
    expect(circles[1].getAttribute("stroke")).toBe("#22c55e")
  })

  test("deve usar cor amarela para score entre 60 e 79", () => {
    const { container } = render(<ScoreGauge score={60} />)
    const circles = container.querySelectorAll("circle")
    expect(circles[1].getAttribute("stroke")).toBe("#eab308")
  })

  test("deve usar cor vermelha para score abaixo de 60", () => {
    const { container } = render(<ScoreGauge score={40} />)
    const circles = container.querySelectorAll("circle")
    expect(circles[1].getAttribute("stroke")).toBe("#ef4444")
  })

  test("deve usar tamanho large por padrão", () => {
    const { container } = render(<ScoreGauge score={50} />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("184")
  })

  test("deve usar tamanho small quando prop size='small'", () => {
    const { container } = render(<ScoreGauge score={50} size="small" />)
    const svg = container.querySelector("svg")
    expect(svg?.getAttribute("width")).toBe("116")
  })

})