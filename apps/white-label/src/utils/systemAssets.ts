/**
 * Utility para carregar e atualizar dinamicamente o favicon e meta tags
 * com base nas configuraÃ§Ãµes globais do sistema
 */

import { supabase } from '@/lib/supabase';

/**
 * Busca as configuraÃ§Ãµes do sistema e atualiza o favicon
 */
export async function loadSystemFavicon() {
  try {
    const cachedName = localStorage.getItem('system_settings_name');
    if (cachedName) {
      document.title = cachedName;
    }

    const { data, error } = await supabase
      .from('system_settings' as any)
      .select('name, favicon, basic_color')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.log('Usando favicon padrÃ£o do pÃºblico');
      return;
    }

    const settings = data as any;

    // Atualizar title da aplicacao
    if (settings.name) {
      document.title = settings.name;
      localStorage.setItem('system_settings_name', settings.name);
    }

    // Atualizar favicon
    if (settings.favicon) {
      const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (faviconLink) {
        faviconLink.href = settings.favicon;
      }
    }

    // Atualizar tema color
    if (settings.basic_color) {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
      if (themeColorMeta) {
        themeColorMeta.content = settings.basic_color;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar favicon do sistema:', error);
    // Continuar com valores padrÃ£o
  }
}
