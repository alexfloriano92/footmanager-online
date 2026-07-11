'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function RegisterPage() {
  const supabase = createClient();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-50">Criar Conta</h1>
        <p className="text-sm text-slate-400">
          Inicie sua jornada no mundo do futebol online.
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
          view="sign_up"
          showLinks={false}
          localization={{
            variables: {
              sign_up: {
                email_label: 'E-mail',
                password_label: 'Senha',
                button_label: 'Criar conta',
                loading_button_label: 'Criando conta...',
                social_provider_text: 'Cadastrar com {{provider}}',
                link_text: 'Não tem conta? Cadastre-se',
                email_input_placeholder: 'Seu endereço de e-mail',
                password_input_placeholder: 'Sua senha',
              }
            }
          }}
        />
      </div>

      <p className="text-center text-sm text-slate-400">
        Já possui uma conta?{' '}
        <Link href="/auth/login" className="font-medium text-emerald-500 hover:text-emerald-400">
          Entrar
        </Link>
      </p>
    </div>
  );
}
