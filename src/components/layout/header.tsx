'use client';

import Link from "next/link";
import { User as AuthUser } from "@supabase/supabase-js";
import { Coach, Club } from "@/types";
import { 
  Bell, 
  Menu,
  Search,
  Wallet,
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Header({ user, coach, club }: { user: AuthUser, coach: Coach, club: Club }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Button size="icon" variant="outline" className="sm:hidden border-slate-800 bg-slate-900">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu lateral</span>
      </Button>

      {/* Busca */}
      <div className="relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          type="search"
          placeholder="Buscar jogador ou clube..."
          className="w-full rounded-lg bg-slate-900 border-slate-800 pl-8 md:w-[200px] lg:w-[320px] text-slate-50 placeholder:text-slate-500 focus-visible:ring-emerald-500"
        />
      </div>

      {/* Status financeiro (Apenas visível se tiver clube) */}
      {club && club.finances && (
        <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 md:flex">
          <Wallet className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            {formatCurrency(club.finances.cash_balance)}
          </span>
        </div>
      )}

      {/* Notificações */}
      <Button size="icon" variant="ghost" className="relative text-slate-400 hover:text-slate-50">
        <Bell className="h-5 w-5" />
        <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 p-0 text-[10px] font-bold text-white">
          3
        </Badge>
        <span className="sr-only">Notificações</span>
      </Button>

      {/* Menu Usuário */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8 border border-slate-700">
              <AvatarImage src={coach?.photo_url || ""} alt={coach?.name || "Treinador"} />
              <AvatarFallback className="bg-slate-800 text-slate-200">
                {coach?.name?.charAt(0) || "T"}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-white">{coach?.name || 'Treinador'}</p>
              <p className="text-xs leading-none text-slate-400">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem className="focus:bg-slate-800 focus:text-white cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-800" />
          <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-slate-800 focus:text-red-300 cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
