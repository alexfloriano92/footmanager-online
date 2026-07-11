import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      <header className="px-6 lg:px-14 h-16 flex items-center border-b border-slate-800">
        <Link className="flex items-center justify-center gap-2" href="#">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">
            FootManager Online
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-slate-300 hover:text-white">Entrar</Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Criar Conta</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex items-center justify-center">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2 max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Construa seu império do futebol
                </h1>
                <p className="mx-auto max-w-[700px] text-slate-400 md:text-xl pt-4">
                  O MMOG de gerenciamento de futebol definitivo. Controle um clube único, com jogadores únicos em um mundo persistente impulsionado por milhares de treinadores.
                </p>
              </div>
              <div className="space-x-4 mt-8">
                <Link href="/auth/register">
                  <Button size="lg" className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700">
                    Comece a Jogar Grátis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-slate-800">
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} FootManager Online. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
