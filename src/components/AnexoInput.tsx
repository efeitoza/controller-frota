"use client";

import { useRef, useState } from "react";
import { IconeCamera } from "./icons";

/**
 * Campo de comprovante: tirar foto pela câmera, escolher da galeria ou anexar PDF.
 */
export function AnexoInput({
  arquivo,
  onChange,
  label = "Comprovante",
}: {
  arquivo: File | null;
  onChange: (f: File | null) => void;
  label?: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string | null>(null);

  function selecionar(f: File | null) {
    onChange(f);
    if (f && f.type.startsWith("image/")) setPrevia(URL.createObjectURL(f));
    else setPrevia(null);
  }

  return (
    <div>
      <span className="rotulo">{label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => camera.current?.click()}
          className="btn-claro flex-1 !py-2.5 text-[13.5px]"
        >
          <IconeCamera className="h-4 w-4" /> Câmera
        </button>
        <button
          type="button"
          onClick={() => galeria.current?.click()}
          className="btn-claro flex-1 !py-2.5 text-[13.5px]"
        >
          Arquivo / PDF
        </button>
      </div>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => selecionar(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => selecionar(e.target.files?.[0] ?? null)}
      />
      {arquivo && (
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
          {previa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previa} alt="prévia" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-ink-soft">
              PDF
            </span>
          )}
          <span className="flex-1 truncate text-[12.5px] text-ink-soft">{arquivo.name}</span>
          <button
            type="button"
            className="text-[12.5px] font-semibold text-rose-600"
            onClick={() => {
              onChange(null);
              setPrevia(null);
            }}
          >
            remover
          </button>
        </div>
      )}
    </div>
  );
}
