"use client"

import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="bg-white/10 p-8 rounded-xl w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Cadastro</h1>

        <input
          type="text"
          placeholder="Nome"
          className="w-full mb-3 p-2 rounded bg-black/20"
        />

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 rounded bg-black/20"
        />

        <input
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-2 rounded bg-black/20"
        />

        <button
          onClick={() => router.push("/login")}
          className="w-full bg-cyan-500 p-2 rounded"
        >
          Criar conta
        </button>

        <p className="mt-4 text-sm">
          Já tem conta?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-cyan-400"
          >
            Voltar
          </button>
        </p>
      </div>
    </div>
  )
}