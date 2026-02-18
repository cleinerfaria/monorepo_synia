/**
 * Componente para gerenciar 4 logos da empresa:
 * - Quadrada (Dark)
 * - Quadrada (Light)
 * - Retangular (Dark)
 * - Retangular (Light)
 */

import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@synia/ui';
import toast from 'react-hot-toast';

interface LogoType {
  key: 'square_dark' | 'square_light' | 'rectangular_dark' | 'rectangular_light';
  label: string;
  description: string;
  aspect: 'square' | 'rectangle';
  theme: 'light' | 'dark';
}

const LOGO_TYPES: LogoType[] = [
  {
    key: 'square_dark',
    label: 'Quadrada - Tema Escuro',
    description: 'Logomarca quadrada (1:1) para uso em fundo escuro',
    aspect: 'square',
    theme: 'dark',
  },
  {
    key: 'square_light',
    label: 'Quadrada - Tema Claro',
    description: 'Logomarca quadrada (1:1) para uso em fundo claro',
    aspect: 'square',
    theme: 'light',
  },
  {
    key: 'rectangular_dark',
    label: 'Retangular - Tema Escuro',
    description: 'Logomarca retangular (4:1) para uso em fundo escuro',
    aspect: 'rectangle',
    theme: 'dark',
  },
  {
    key: 'rectangular_light',
    label: 'Retangular - Tema Claro',
    description: 'Logomarca retangular (4:1) para uso em fundo claro',
    aspect: 'rectangle',
    theme: 'light',
  },
];

interface CompanyLogosProps {
  logos: {
    square_dark: string;
    square_light: string;
    rectangular_dark: string;
    rectangular_light: string;
  };
  onLogosChange: (
    type: 'square_dark' | 'square_light' | 'rectangular_dark' | 'rectangular_light',
    value: string
  ) => void;
  onSave?: () => void;
  isLoading?: boolean;
}

export function CompanyLogos({
  logos,
  onLogosChange,
  onSave,
  isLoading = false,
}: CompanyLogosProps) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const handleLogoSelect = async (logoType: LogoType, file: File) => {
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecione um arquivo de imagem');
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem não pode ser maior que 5MB');
      return;
    }

    try {
      setUploadingKey(logoType.key);

      // Criar URL de preview local
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const logKey = logoType.key as
          | 'square_dark'
          | 'square_light'
          | 'rectangular_dark'
          | 'rectangular_light';
        onLogosChange(logKey, dataUrl);
        toast.success(`Logo ${logoType.label.toLowerCase()} atualizada`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao fazer upload da logo:', error);
      toast.error('Erro ao fazer upload da logo');
    } finally {
      setUploadingKey(null);
    }
  };

  const handleRemoveLogo = (logoType: LogoType) => {
    const logKey = logoType.key as
      | 'square_dark'
      | 'square_light'
      | 'rectangular_dark'
      | 'rectangular_light';
    onLogosChange(logKey, '');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Logomarcas</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure as logomarcas para diferentes temas e formatos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {LOGO_TYPES.map((logoType) => {
          const logoUrl = logos[logoType.key];
          const isUploading = uploadingKey === logoType.key;

          return (
            <div
              key={logoType.key}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              {/* Header */}
              <div className="mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">{logoType.label}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{logoType.description}</p>
              </div>

              {/* Preview */}
              <div
                className={`mb-4 flex h-40 items-center justify-center rounded-lg border-2 border-dashed ${
                  logoType.theme === 'dark'
                    ? 'bg-gray-900 dark:bg-gray-950'
                    : 'bg-gray-50 dark:bg-gray-800'
                } border-gray-300 dark:border-gray-600`}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={logoType.label}
                    className={`max-h-full max-w-full object-contain ${
                      logoType.aspect === 'rectangle' ? 'w-full' : ''
                    }`}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">Nenhuma imagem</span>
                  </div>
                )}
              </div>

              {/* Upload & Actions */}
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleLogoSelect(logoType, file);
                      }
                    }}
                    disabled={isUploading || isLoading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="neutral"
                    className="w-full"
                    disabled={isUploading || isLoading}
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    {isUploading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
                        Upload...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar
                      </>
                    )}
                  </Button>
                </label>

                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploading || isLoading}
                    onClick={() => handleRemoveLogo(logoType)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {onSave && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isLoading}
            className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            {isLoading ? 'Salvando...' : 'Salvar Logos'}
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        <p>
          <strong>Dica:</strong> Use imagens em PNG com fundo transparente para melhor
          compatibilidade. As dimensões recomendadas são:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Quadrada: 512x512px</li>
          <li>Retangular: 2048x512px (4:1)</li>
        </ul>
      </div>
    </div>
  );
}
