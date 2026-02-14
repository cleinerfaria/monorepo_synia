import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Input, Card } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('Por favor, digite seu e-mail')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw error
      }

      setIsEmailSent(true)
      toast.success('E-mail de recuperação enviado com sucesso!')
    } catch (error) {
      console.error('Erro ao enviar e-mail de recuperação:', error)
      toast.error('Erro ao enviar e-mail de recuperação. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setIsEmailSent(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEmailSent ? 'E-mail Enviado' : 'Recuperar Senha'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {!isEmailSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Digite seu e-mail para receber um link de recuperação de senha.
              </p>

              <Input
                type="email"
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading || !email.trim()}
                  className="flex-1"
                >
                  Enviar E-mail
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <p className="text-sm text-green-800 dark:text-green-300">
                  Um e-mail foi enviado para <strong>{email}</strong> com as instruções para
                  recuperar sua senha.
                </p>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Se não receber o e-mail em alguns minutos, verifique sua pasta de spam.
              </p>

              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
