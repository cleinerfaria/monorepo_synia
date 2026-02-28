#!/usr/bin/env node

/**
 * Script para fazer upload dos assets do sistema (logos e favicon)
 * para o bucket 'system_assets' do Supabase
 *
 * Uso: node scripts/upload-system-assets.cjs
 */

const fs = require('fs');
const path = require('path');

// URL do bucket será: https://project-id.supabase.co/storage/v1/object/public/system_assets/path

const ASSETS_TO_UPLOAD = [
  {
    source: 'public/favicon.svg',
    destination: 'favicon.svg',
    description: 'Favicon do sistema',
  },
];

async function uploadAssets() {
  try {
    // Importar Supabase dinamicamente
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error(
        'Variáveis de ambiente VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não foram configuradas'
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('Iniciando upload de assets do sistema...\n');

    const uploadedUrls = {};

    for (const asset of ASSETS_TO_UPLOAD) {
      const filePath = path.join(process.cwd(), asset.source);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Arquivo não encontrado: ${asset.source}`);
        continue;
      }

      const fileContent = fs.readFileSync(filePath);
      const mimeType = asset.source.endsWith('.svg') ? 'image/svg+xml' : 'image/png';

      console.log(`📤 Uploading: ${asset.destination}`);
      console.log(`   Descrição: ${asset.description}`);

      const { error } = await supabase.storage
        .from('system_assets')
        .upload(asset.destination, fileContent, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        console.error(`❌ Erro ao fazer upload de ${asset.destination}:`);
        console.error(`   ${error.message}`);
      } else {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/system_assets/${asset.destination}`;
        console.log(`✅ Upload bem-sucedido!`);
        console.log(`   URL: ${publicUrl}\n`);

        // Armazenar URL para atualização posterior
        if (asset.destination.includes('favicon')) {
          uploadedUrls.favicon = publicUrl;
        }
      }
    }

    // Atualizar tabela system_settings com as URLs dos arquivos
    if (Object.keys(uploadedUrls).length > 0) {
      console.log('📝 Atualizando configurações do sistema com as URLs dos arquivos...\n');

      const { error: updateError } = await supabase
        .from('system_settings')
        .update(uploadedUrls)
        .eq('name', 'Synia');

      if (updateError) {
        console.error('⚠️  Erro ao atualizar system_settings com as URLs:', updateError.message);
        console.log('Faça a atualização manual com as seguintes URLs:');
        console.log(JSON.stringify(uploadedUrls, null, 2));
      } else {
        console.log('✅ Configurações do sistema atualizadas com sucesso!\n');
      }
    }

    console.log('✅ Processo de upload concluído!');
  } catch (error) {
    console.error('❌ Erro durante upload de assets:', error.message);
    process.exit(1);
  }
}

uploadAssets();
