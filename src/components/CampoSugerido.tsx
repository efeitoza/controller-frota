"use client";

import { useId } from "react";

/**
 * Campo de digitação livre com sugestões do cadastro.
 * O supervisor pode escolher um valor da lista ou digitar um novo —
 * nada é bloqueado por não estar cadastrado.
 */
export function CampoSugerido({
  label,
  valor,
  onChange,
  opcoes,
  placeholder,
  inputMode,
  obrigatorio = false,
}: {
  label: string;
  valor: string;
  onChange: (v: string) => void;
  opcoes: string[];
  placeholder?: string;
  inputMode?: "text" | "numeric";
  obrigatorio?: boolean;
}) {
  const id = useId();
  return (
    <label className="block">
      <span className="rotulo">{label}</span>
      <input
        className="campo"
        list={id}
        value={valor}
        inputMode={inputMode}
        placeholder={placeholder}
        required={obrigatorio}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="off"
        autoComplete="off"
      />
      <datalist id={id}>
        {opcoes.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  );
}
