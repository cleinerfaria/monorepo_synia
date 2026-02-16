import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button, Card, CardContent } from '@/components/ui';
import { ShieldX, LogOut } from 'lucide-react';

export default function NoAccessPage() {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Acesso Restrito</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sua conta não possui permissão para acessar o sistema. Entre em contato com o
            administrador para solicitar acesso.
          </p>
          <Button
            variant="neutral"
            className="mt-6"
            onClick={handleSignOut}
            showIcon={true}
            icon={<LogOut className="mr-2 h-4 w-4" />}
          >
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
