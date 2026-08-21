"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Aviso, Campo, Card, Etiqueta, Vazio, toast } from "@/components/ui";
import { criarAcesso, listarUsuarios, redefinirSenha } from "@/lib/api";
import { AppUser, Role } from "@/lib/types";

const PAPEIS: { valor: Role; texto: string; ajuda: string }[] = [
  { valor: "driver", texto: "Condutor", ajuda: "Registra jornada, abastecimento, manutenção e EPI." },
  { valor: "supervisor", texto: "Supervisão", ajuda: "Registra ocorrências disciplinares." },
  { valor: "admin", texto: "Gestor", ajuda: "Vê tudo, cadastra veículos, condutores e acessos." },
];

export default function Acessos() {
  const { ehAdmin, modoDemo, recarregar } = useSessao();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<AppUser[]>([]);
  const [novo, setNovo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [login, setLogin] = useState("");
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [telefone, setTelefone] = useState("");
  const [papel, setPapel] = useState<Role>("driver");
  const [senha, setSenha] = useState("");

  const [trocando, setTrocando] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  useEffect(() => {
    if (!ehAdmin) router.replace("/mais");
  }, [ehAdmin, router]);

  const carregar = useCallback(async () => {
    setUsuarios(await listarUsuarios());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!login.trim()) return toast("Informe o login.", "erro");
    if (senha.length < 6) return toast("A senha precisa ter ao menos 6 caracteres.", "erro");
    setEnviando(true);
    try {
      await criarAcesso({
        login: login.trim(),
        senha,
        nome: nome.trim(),
        papel,
        matricula: matricula.trim() || null,
        telefone: telefone.trim() || null,
      });
      toast("Acesso criado. Entregue a senha ao usuário.", "ok");
      setLogin("");
      setNome("");
      setMatricula("");
      setTelefone("");
      setSenha("");
      setNovo(false);
      await carregar();
      await recarregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function trocarSenha(u: AppUser) {
    if (novaSenha.length < 6) return toast("A senha precisa ter ao menos 6 caracteres.", "erro");
    try {
      await redefinirSenha(u.id, novaSenha);
      toast(`Senha de ${u.name} redefinida.`, "ok");
      setTrocando(null);
      setNovaSenha("");
    } catch (err) {
      toast((err as Error).message, "erro");
    }
  }

  const rotuloPapel = (r: Role) => PAPEIS.find((p) => p.valor === r)?.texto ?? r;

  return (
    <>
      <AppHeader titulo="Acessos" voltar="/mais" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        {modoDemo && (
          <Aviso nivel="atencao" titulo="Modo demonstração">
            Os acessos criados aqui ficam só neste navegador e qualquer senha entra. Com o Supabase
            configurado, a senha passa a valer de verdade.
          </Aviso>
        )}

        <Card
          titulo={novo ? "Novo acesso" : `Usuários (${usuarios.length})`}
          acao={
            <button
              className="text-[13px] font-semibold text-brand-900"
              onClick={() => setNovo((v) => !v)}
            >
              {novo ? "cancelar" : "+ criar acesso"}
            </button>
          }
        >
          {novo ? (
            <form onSubmit={criar} className="space-y-3">
              <Campo label="Login">
                <input
                  className="campo"
                  value={login}
                  onChange={(e) => setLogin(e.target.value.toLowerCase())}
                  placeholder="antonio.campos"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
              </Campo>
              <Campo label="Nome completo">
                <input
                  className="campo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Antonio Campos"
                />
              </Campo>
              <Campo label="Perfil">
                <select
                  className="campo"
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as Role)}
                >
                  {PAPEIS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.texto}
                    </option>
                  ))}
                </select>
              </Campo>
              <p className="-mt-1 text-[12px] text-ink-muted">
                {PAPEIS.find((p) => p.valor === papel)?.ajuda}
              </p>

              {papel === "driver" && (
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Matrícula">
                    <input
                      className="campo"
                      value={matricula}
                      onChange={(e) => setMatricula(e.target.value)}
                      inputMode="numeric"
                    />
                  </Campo>
                  <Campo label="Telefone">
                    <input
                      className="campo"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                    />
                  </Campo>
                </div>
              )}

              <Campo label="Senha inicial">
                <input
                  className="campo"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="mínimo 6 caracteres"
                  autoCapitalize="off"
                />
              </Campo>
              <p className="-mt-1 text-[12px] text-ink-muted">
                Anote e entregue ao usuário — depois de salva, nem você consegue vê-la; só
                redefinir.
              </p>

              <button className="btn" disabled={enviando}>
                {enviando ? "Criando..." : "Criar acesso"}
              </button>
            </form>
          ) : usuarios.length === 0 ? (
            <Vazio texto="Nenhum acesso criado ainda." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <li key={u.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium">{u.name || "—"}</p>
                      <p className="truncate text-[12px] text-ink-muted">
                        {u.email.split("@")[0]}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <Etiqueta
                        texto={rotuloPapel(u.role)}
                        cor={u.role === "admin" ? "azul" : u.role === "supervisor" ? "ambar" : "slate"}
                      />
                      <button
                        className="text-[12.5px] font-semibold text-brand-900"
                        onClick={() => {
                          setTrocando(trocando === u.id ? null : u.id);
                          setNovaSenha("");
                        }}
                      >
                        senha
                      </button>
                    </div>
                  </div>

                  {trocando === u.id && (
                    <div className="mt-2 flex gap-2">
                      <input
                        className="campo"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="nova senha"
                        autoCapitalize="off"
                      />
                      <button className="btn btn-sm flex-none" onClick={() => trocarSenha(u)}>
                        Salvar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card titulo="Como funciona">
          <ul className="space-y-2 text-[13px] leading-snug text-ink-soft">
            <li>Só o gestor cria acessos — não existe autocadastro na tela de login.</li>
            <li>
              O usuário entra com o login (sem @) e a senha que você definiu. Ele não consegue
              trocá-la sozinho; se esquecer, você redefine aqui.
            </li>
            <li>
              Criar um acesso de condutor já cria a ficha dele em Condutores, com nome e matrícula.
            </li>
          </ul>
        </Card>
      </main>
    </>
  );
}
