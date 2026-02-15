import { useEffect, useState } from 'react';

export function useGoogleMapsApiError() {
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Interceptar erros específicos do Google Maps
    const originalError = console.error;

    console.error = function (...args: any[]) {
      const message = args.join(' ');

      if (message.includes('ApiNotActivatedMapError')) {
        setApiError('APIs do Google Maps não estão ativadas no projeto');
        return; // Não exibir o erro no console
      }

      if (message.includes('InvalidKeyMapError')) {
        setApiError('Chave da API do Google Maps inválida');
        return; // Não exibir o erro no console
      }

      if (message.includes('RefererNotAllowedMapError')) {
        setApiError('Domínio não autorizado para esta API key');
        return; // Não exibir o erro no console
      }

      // Para outros erros, exibir normalmente
      originalError.apply(console, args);
    };

    // Cleanup
    return () => {
      console.error = originalError;
    };
  }, []);

  return apiError;
}
