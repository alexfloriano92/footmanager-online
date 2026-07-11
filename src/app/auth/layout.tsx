import Link from "next/link";
import { Trophy } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2 bg-slate-950">
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-2 mb-8">
            <Trophy className="h-8 w-8 text-emerald-500" />
            <span className="text-2xl font-bold text-slate-50">FootManager</span>
          </div>
          {children}
        </div>
      </div>
      <div className="hidden lg:block relative w-full flex-1">
        <div className="absolute inset-0 bg-emerald-900 bg-opacity-20 z-10"></div>
        <img
          className="absolute inset-0 h-full w-full object-cover grayscale opacity-20"
          src="https://images.unsplash.com/photo-1518605368461-1e12d5386f7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Estádio de futebol"
        />
        <div className="absolute inset-0 z-20 flex flex-col justify-center px-12 text-center lg:text-left">
          <h2 className="text-4xl font-bold text-white mb-4">Gerencie seu Clube</h2>
          <p className="text-xl text-slate-300 max-w-lg">
            Um universo persistente com milhares de treinadores. Compre, venda, treine e conquiste a glória no maior simulador de futebol online.
          </p>
        </div>
      </div>
    </div>
  );
}
