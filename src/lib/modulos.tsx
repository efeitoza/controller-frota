import { SVGProps } from "react";
import {
  IconeCombustivel,
  IconeJornada,
  IconeManutencao,
  IconeMais,
  IconeOcorrencia,
  IconeRelatorio,
} from "@/components/icons";

export interface Modulo {
  prefixo: string;
  titulo: string;
  frase: string;
  Icone: (p: SVGProps<SVGSVGElement>) => React.ReactElement;
  /** classes do círculo do ícone no cabeçalho (fundo escuro) */
  circulo: string;
  /** classe de texto para detalhes claros dentro do conteúdo */
  destaque: string;
}

export const MODULOS: Modulo[] = [
  {
    prefixo: "/jornada",
    titulo: "Jornada",
    frase: "Início e fim do dia — o km rodado é calculado sozinho.",
    Icone: IconeJornada,
    circulo: "bg-sky-400/15 text-sky-300",
    destaque: "text-sky-700",
  },
  {
    prefixo: "/abastecimento",
    titulo: "Abastecimento",
    frase: "Informe o km atual; consumo e preço por litro saem prontos.",
    Icone: IconeCombustivel,
    circulo: "bg-emerald-400/15 text-emerald-300",
    destaque: "text-emerald-700",
  },
  {
    prefixo: "/manutencao",
    titulo: "Manutenção",
    frase: "Serviços, valores e comprovantes do veículo.",
    Icone: IconeManutencao,
    circulo: "bg-amber-400/15 text-amber-300",
    destaque: "text-amber-700",
  },
  {
    prefixo: "/ocorrencias",
    titulo: "Ocorrências",
    frase: "Registro disciplinar pronto para enviar no grupo.",
    Icone: IconeOcorrencia,
    circulo: "bg-rose-400/15 text-rose-300",
    destaque: "text-rose-700",
  },
  {
    prefixo: "/relatorios",
    titulo: "Relatórios",
    frase: "Filtre por período e exporte o que precisar.",
    Icone: IconeRelatorio,
    circulo: "bg-violet-400/15 text-violet-300",
    destaque: "text-violet-700",
  },
  {
    prefixo: "/mais",
    titulo: "Mais",
    frase: "Perfil, cadastros e preferências do aplicativo.",
    Icone: IconeMais,
    circulo: "bg-white/10 text-brand-100",
    destaque: "text-brand-900",
  },
];

export const moduloDoCaminho = (caminho: string): Modulo | undefined =>
  MODULOS.find((m) => caminho.startsWith(m.prefixo));
