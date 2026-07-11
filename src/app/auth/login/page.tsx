'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const supabase = createClient();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-50">Entrar</h1>
        <p className="text-sm text-slate-400">
          Bem-vindo de volta! Faça login para gerenciar seu clube.
        </p>
      </div>

      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#059669', // emerald-600
                  brandAccent: '#047857', // emerald-700
                  defaultButtonBackground: '#0f172a', // slate-900
                  defaultButtonBackgroundHover: '#1e293b', // slate-800
                  inputBackground: '#0f172a', // slate-900
                  inputBorder: '#1e293b', // slate-800
                  inputBorderHover: '#334155', // slate-700
                  inputBorderFocus: '#10b981', // emerald-500
                },
              },
            },
            className: {
              container: 'text-slate-200',
              label: 'text-slate-300',
              button: 'text-white font-medium',
              input: 'text-white',
              anchor: 'text-emerald-500 hover:text-emerald-400',
              divider: 'bg-slate-800',
              message: 'text-red-400',
            }
          }}
          providers={['google', 'discord']}
          view="sign_in"
          showLinks={false}
          localization={{
            variables: {
              sign_in: {
                email_label: 'E-mail',
                password_label: 'Senha',
                button_label: 'Entrar',
                loading_button_label: 'Entrando...',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entre',
                email_input_placeholder: 'Seu endereço de e-mail',
                password_input_placeholder: 'Sua senha',
              }
            }
          }}
        />
      </div>

      <p className="text-center text-sm text-slate-400">
        Não tem uma conta?{' '}
        <Link href="/auth/register" className="font-medium text-emerald-500 hover:text-emerald-400">
          Crie agora
        </Link>
      </p>
    </div>
  );
}
