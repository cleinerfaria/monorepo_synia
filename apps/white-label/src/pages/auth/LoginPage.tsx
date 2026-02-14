import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Input, Card } from '@/components/ui';
import { ButtonNew } from '@/components/ui/ButtonNew';
import PremiumHeroPanel from '@/components/auth/PremiumHeroPanel';
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal';
import { DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

interface LoginForm {
  email: string;
  password: string;
}

type RgbTuple = [number, number, number];

function parseColorToRgbTuple(color: string): RgbTuple | null {
  const normalized = color.trim();
  const hex = normalized.replace('#', '');

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const expanded = hex
      .split('')
      .map((value) => `${value}${value}`)
      .join('');
    return [
      parseInt(expanded.slice(0, 2), 16),
      parseInt(expanded.slice(2, 4), 16),
      parseInt(expanded.slice(4, 6), 16),
    ];
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  const rgbMatch = normalized.match(/^rgb\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*\)$/i);
  if (!rgbMatch) return null;

  const values = rgbMatch.slice(1, 4).map((value) => Number(value));
  if (values.some((value) => Number.isNaN(value))) return null;
  return values.map((value) => Math.max(0, Math.min(255, Math.round(value)))) as RgbTuple;
}

function mixRgbColor(base: RgbTuple, target: RgbTuple, intensity: number): RgbTuple {
  const mixChannel = (index: number) =>
    Math.round(base[index] + (target[index] - base[index]) * intensity);
  return [mixChannel(0), mixChannel(1), mixChannel(2)];
}

function rgbTupleToCss(rgb: RgbTuple): string {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

export default function LoginPage() {
  const queryClient = useQueryClient();
  const { signIn } = useAuthStore();
  const { data: systemSettings } = useSystemSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const loginBasicColor = systemSettings?.basic_color || DEFAULT_COMPANY_COLOR;
  const loginPrimaryVars = useMemo(() => {
    const base =
      parseColorToRgbTuple(loginBasicColor) || parseColorToRgbTuple(DEFAULT_COMPANY_COLOR)!;
    const white: RgbTuple = [255, 255, 255];
    const black: RgbTuple = [0, 0, 0];

    return {
      '--color-primary-200': rgbTupleToCss(mixRgbColor(base, white, 0.35)),
      '--color-primary-300': rgbTupleToCss(mixRgbColor(base, white, 0.2)),
      '--color-primary-400': rgbTupleToCss(mixRgbColor(base, white, 0.1)),
      '--color-primary-500': rgbTupleToCss(base),
      '--color-primary-700': rgbTupleToCss(mixRgbColor(base, black, 0.25)),
    } as CSSProperties;
  }, [loginBasicColor]);
  const systemName =
    systemSettings?.name ||
    localStorage.getItem('system_settings_name') ||
    window.location.hostname;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mediaQuery.matches);
    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  useEffect(() => {
    if (systemName) {
      document.title = systemName;
      localStorage.setItem('system_settings_name', systemName);
    }
  }, [systemName]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      setIsSubmitting(false);
      toast.error('Credenciais inválidas. Tente novamente.');
      return;
    }

    // Invalida a query de superadmin para forçar recarga
    await queryClient.invalidateQueries({ queryKey: ['is_superadmin'] });

    toast.success('Login realizado com sucesso!');
    // O redirecionamento é feito pelo PublicRoute automaticamente
    // quando detecta que há sessão ativa
    setIsSubmitting(false);
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {isDesktop && (
        <div className="hidden lg:block">
          <PremiumHeroPanel basicColor={loginBasicColor} />
        </div>
      )}
      <div className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            {systemSettings?.logo_light ? (
              <img
                src={systemSettings.logo_light}
                alt={systemName}
                className="mx-auto block h-20 w-auto dark:hidden"
              />
            ) : (
              <img
                src="/logo_light.png"
                alt={systemName}
                className="mx-auto block h-20 w-auto dark:hidden"
              />
            )}
            {systemSettings?.logo_dark ? (
              <img
                src={systemSettings.logo_dark}
                alt={systemName}
                className="mx-auto hidden h-20 w-auto dark:block"
              />
            ) : (
              <img
                src="/logo_dark.png"
                alt={systemName}
                className="mx-auto hidden h-20 w-auto dark:block"
              />
            )}
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {systemSettings?.login_frase || 'Sistema de gestão de empresas'}
            </p>
          </div>

          {/* Login Card */}
          <Card className="p-8">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
              autoComplete="on"
              noValidate
              style={loginPrimaryVars}
            >
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                autoComplete="username email"
                data-form-type="login"
                className="!border-primary-500/70 focus:!border-primary-500 focus:!ring-primary-500/25"
                {...register('email', {
                  required: 'E-mail é obrigatório',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'E-mail inválido',
                  },
                })}
                error={errors.email?.message}
              />

              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  data-form-type="login"
                  className="!border-primary-500/70 pr-10 focus:!border-primary-500 focus:!ring-primary-500/25"
                  {...register('password', {
                    required: 'Senha é obrigatória',
                    minLength: {
                      value: 6,
                      message: 'Senha deve ter pelo menos 6 caracteres',
                    },
                  })}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  className="absolute right-3 top-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 focus:ring-2"
                    style={{
                      accentColor: loginBasicColor,
                    }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Lembrar-me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                  className="text-sm transition-opacity hover:opacity-85"
                  style={{
                    color: loginBasicColor,
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>

              <div style={loginPrimaryVars} className="[&>div]:w-full">
                <ButtonNew
                  type="submit"
                  label={isSubmitting ? 'Entrando...' : 'Entrar'}
                  variant="solid"
                  size="lg"
                  showIcon={false}
                  disabled={isSubmitting}
                  className="w-full !text-white"
                />
              </div>
            </form>
          </Card>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
            © 2026 {systemName}. Todos os direitos reservados.
          </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={() => setIsForgotPasswordModalOpen(false)}
      />
    </div>
  );
}
