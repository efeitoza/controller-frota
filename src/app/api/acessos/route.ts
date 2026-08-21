import { NextResponse } from "next/server";
import { clienteAdmin, emailDoLogin, exigeGestor, temServico } from "@/lib/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cria o acesso de um usuário. Só o gestor pode chamar. */
export async function POST(req: Request) {
  if (!temServico) {
    return NextResponse.json(
      { erro: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." },
      { status: 500 }
    );
  }

  const gestor = await exigeGestor(req);
  if (!gestor) return NextResponse.json({ erro: "Apenas o gestor pode criar acessos." }, { status: 403 });

  const corpo = await req.json().catch(() => null);
  const login = String(corpo?.login ?? "").trim();
  const senha = String(corpo?.senha ?? "");
  const nome = String(corpo?.nome ?? "").trim();
  const papel = String(corpo?.papel ?? "driver");
  const matricula = corpo?.matricula ? String(corpo.matricula).trim() : null;
  const telefone = corpo?.telefone ? String(corpo.telefone).trim() : null;

  if (!login) return NextResponse.json({ erro: "Informe o login." }, { status: 400 });
  if (senha.length < 6)
    return NextResponse.json({ erro: "A senha precisa ter ao menos 6 caracteres." }, { status: 400 });
  if (!["driver", "admin", "supervisor"].includes(papel))
    return NextResponse.json({ erro: "Papel inválido." }, { status: 400 });

  const sb = clienteAdmin();
  const email = emailDoLogin(login);

  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { name: nome || login, login, role: papel },
  });

  if (error || !data.user) {
    const msg = error?.message ?? "Não foi possível criar o acesso.";
    const jaExiste = /already|registered|exists/i.test(msg);
    return NextResponse.json(
      { erro: jaExiste ? "Já existe um acesso com esse login." : msg },
      { status: 400 }
    );
  }

  const id = data.user.id;

  // o gatilho do banco já criou users/drivers; aqui garantimos papel e dados
  await sb.from("users").update({ role: papel, name: nome || login, email }).eq("id", id);

  if (papel === "driver") {
    const { data: condutor } = await sb
      .from("drivers")
      .select("id")
      .eq("user_id", id)
      .maybeSingle();
    if (condutor) {
      await sb
        .from("drivers")
        .update({ name: nome || login, registration: matricula, phone: telefone, email })
        .eq("id", condutor.id);
    } else {
      await sb.from("drivers").insert({
        user_id: id,
        name: nome || login,
        registration: matricula,
        phone: telefone,
        email,
      });
    }
  }

  return NextResponse.json({ id, email });
}
