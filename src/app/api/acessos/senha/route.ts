import { NextResponse } from "next/server";
import { clienteAdmin, exigeGestor, temServico } from "@/lib/servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redefine a senha de um usuário. Só o gestor pode chamar. */
export async function POST(req: Request) {
  if (!temServico) {
    return NextResponse.json(
      { erro: "Servidor sem SUPABASE_SERVICE_ROLE_KEY configurada." },
      { status: 500 }
    );
  }

  const gestor = await exigeGestor(req);
  if (!gestor)
    return NextResponse.json({ erro: "Apenas o gestor pode redefinir senhas." }, { status: 403 });

  const corpo = await req.json().catch(() => null);
  const userId = String(corpo?.userId ?? "").trim();
  const senha = String(corpo?.senha ?? "");

  if (!userId) return NextResponse.json({ erro: "Usuário não informado." }, { status: 400 });
  if (senha.length < 6)
    return NextResponse.json({ erro: "A senha precisa ter ao menos 6 caracteres." }, { status: 400 });

  const { error } = await clienteAdmin().auth.admin.updateUserById(userId, { password: senha });
  if (error) return NextResponse.json({ erro: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
