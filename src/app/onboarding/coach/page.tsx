'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').max(50),
  nationality: z.string().min(2, 'Selecione uma nacionalidade'),
  coachingStyle: z.enum(['attack', 'balanced', 'defense', 'possession', 'counter']),
  preferredFormation: z.string().min(3),
});

const formations = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1'];
const nationalities = ['Brasil', 'Argentina', 'Portugal', 'Espanha', 'Inglaterra', 'Itália', 'Alemanha', 'França'];

export default function CoachOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      nationality: '',
      coachingStyle: 'balanced',
      preferredFormation: '4-3-3',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { error } = await supabase.from('coaches').insert({
        user_id: user.id,
        name: values.name,
        nationality: values.nationality,
        country: values.nationality, // Simplified for MVP
        coaching_style: values.coachingStyle,
        preferred_formation: values.preferredFormation,
      });

      if (error) throw error;

      toast.success('Perfil de treinador criado com sucesso!');
      router.push('/onboarding/club');
      
    } catch (error: any) {
      toast.error('Erro ao criar perfil', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Card className="max-w-xl w-full bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white">Crie seu Perfil de Treinador</CardTitle>
          <CardDescription className="text-slate-400">
            Antes de assumir um clube, você precisa definir seu perfil no mundo do futebol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Nome do Treinador</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pep Guardiola" className="bg-slate-950 border-slate-800 text-white" {...field} />
                    </FormControl>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Nacionalidade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                            <SelectValue placeholder="Selecione um país" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {nationalities.map((nat) => (
                            <SelectItem key={nat} value={nat} className="focus:bg-slate-800 focus:text-white">
                              {nat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredFormation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Formação Preferida</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                            <SelectValue placeholder="Formação" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {formations.map((form) => (
                            <SelectItem key={form} value={form} className="focus:bg-slate-800 focus:text-white">
                              {form}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="coachingStyle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Estilo de Jogo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue placeholder="Estilo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="attack" className="focus:bg-slate-800 focus:text-white">Ofensivo</SelectItem>
                        <SelectItem value="balanced" className="focus:bg-slate-800 focus:text-white">Equilibrado</SelectItem>
                        <SelectItem value="defense" className="focus:bg-slate-800 focus:text-white">Defensivo</SelectItem>
                        <SelectItem value="possession" className="focus:bg-slate-800 focus:text-white">Posse de Bola (Tiki-Taka)</SelectItem>
                        <SelectItem value="counter" className="focus:bg-slate-800 focus:text-white">Contra-ataque</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-slate-500">
                      O estilo influencia bônus táticos durante as partidas.
                    </FormDescription>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Perfil e Continuar'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
