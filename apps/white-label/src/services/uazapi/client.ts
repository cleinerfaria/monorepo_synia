import { supabase } from '@/lib/supabase';
import { getValidAccessToken } from '@/lib/authToken';
import toast from 'react-hot-toast';

export type UazapiRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  instanceId?: string;
  admin?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  notifyOnError?: boolean;
};

export async function uazapiRequest<T>(path: string, options: UazapiRequestOptions = {}) {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    const err = new Error('Sessão expirada ou não autorizada. Faça login novamente.');
    if (options.notifyOnError) {
      toast.error(err.message, { id: 'uazapi-error' });
    }
    throw err;
  }

  const { data, error } = await supabase.functions.invoke('uazapi-proxy', {
    body: {
      path,
      method: options.method || 'POST',
      body: options.body,
      instanceId: options.instanceId,
      admin: options.admin,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error('Uazapi proxy request failed:', error);

    let message = error.message || 'Erro ao comunicar com Uazapi';

    // Tratamento específico para erros da Edge Function
    // Tratamento específico para erros da Edge Function
    if (message.includes('Edge Function returned a non-2xx status code')) {
      console.error('Raw Func Error:', error); // Log raw error to see structure

      // Check if context exists safely
      const response = (error as any).context?.response;

      if (response && response.status === 401) {
        message = 'Sessão expirada ou não autorizada. Recarregue a página.';
        try {
          // Clone response because it might be consumed
          const body = await response.clone().json();
          console.error('Detalhes do erro 401:', body);
        } catch (e) {
          console.error('Erro ao ler corpo da resposta 401:', e);
        }
      } else {
        message = 'Erro de comunicação com o servidor de integração.';
        if (response) {
          try {
            const body = await response.clone().json();
            console.error('Detalhes do erro da Edge Function:', body);
          } catch (e) {
            console.error('Erro ao ler corpo da resposta da Edge Function:', e);
          }
        } else {
          console.error('Objeto "context.response" não encontrado no erro.', error);
        }
      }
    }

    // Evita mostrar toast se já foi tratado ou se o chamador vai tratar
    // Mas mantemos se notifyOnError for true e não for um erro genérico duplicado
    if (options.notifyOnError) {
      toast.error(message, { id: 'uazapi-error' }); // id evita duplicatas do mesmo erro
    }

    // Anexar a mensagem tratada ao erro para quem capturar
    error.message = message;
    throw error;
  }

  // O proxy retorna o corpo da resposta da Uazapi diretamente em data
  return data as T;
}
