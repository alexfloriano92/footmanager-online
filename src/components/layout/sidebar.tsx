'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, Users, Shirt, Activity, 
  ShoppingCart, Calendar, Trophy, 
  LineChart, MessageSquare, Shield,
  LogOut, Settings, Search, BarChart2, ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar({ currentClub, currentCoach }: { currentClub: any, currentCoach: any }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Painel", href: "/dashboard", icon: Home },
    { name: "Clube", href: "/club", icon: Shield },
    { name: "Elenco", href: "/squad", icon: Users },
    { name: "Táticas", href: "/tactics", icon: Shirt },
    { name: "Treino", href: "/training", icon: Activity },
    { name: "Partidas", href: "/matches", icon: Calendar },
    { name: "Observação", href: "/scout", icon: Search },
    { name: "Negociações", href: "/negotiations", icon: ArrowRightLeft },
    { name: "Ranking", href: "/ranking", icon: BarChart2 },
    { name: "Mercado", href: "/market", icon: ShoppingCart },
    { name: "Ligas & Copas", href: "/competitions", icon: Trophy },
    { name: "Finanças", href: "/finances", icon: LineChart },
    { name: "Mensagens", href: "/messages", icon: MessageSquare },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 sm:flex">
      <div className="flex h-14 items-center border-b border-slate-800 px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-6 w-6 text-emerald-500" />
          <span className="text-emerald-500">FootManager</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          <div className="px-2 py-4 mb-2 bg-slate-900 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              {currentClub?.badge_url ? (
                <img src={currentClub.badge_url} alt={currentClub.name} className="w-8 h-8 object-contain" />
              ) : (
                <Shield className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="font-semibold text-slate-200 line-clamp-1">{currentClub?.name || 'Sem Clube'}</p>
              <p className="text-xs text-slate-500">Divisão 1</p>
            </div>
          </div>
          
          <div className="my-2 border-t border-slate-800" />

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-slate-50",
                  isActive ? "bg-slate-800 text-slate-50" : "text-slate-400"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-900 flex items-center justify-center text-emerald-400 font-bold overflow-hidden">
            {currentCoach?.photo_url ? (
              <img src={currentCoach.photo_url} alt={currentCoach.name} className="w-full h-full object-cover" />
            ) : (
              currentCoach?.name?.charAt(0) || 'T'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{currentCoach?.name || 'Treinador'}</p>
            <p className="text-xs text-slate-500 truncate">Rep: {currentCoach?.reputation || 50}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
