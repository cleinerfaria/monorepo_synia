import { createContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalFooter, Button } from '@/components/ui';

interface NavigationGuardContextType {
  /** Indica se há alterações não salvas */
  hasUnsavedChanges: boolean;
  /** Define se há alterações não salvas */
  setHasUnsavedChanges: (value: boolean) => void;
  /** Navega com segurança, mostrando confirmação se houver alterações não salvas */
  safeNavigate: (path: string) => void;
  /** Handler para interceptar cliques em links */
  handleLinkClick: (e: React.MouseEvent, href: string) => void;
}

const NavigationGuardContext = createContext<NavigationGuardContextType | null>(null);

export { NavigationGuardContext };

function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const safeNavigate = useCallback(
    (path: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(path);
        setShowExitConfirmModal(true);
      } else {
        navigate(path);
      }
    },
    [hasUnsavedChanges, navigate]
  );

  const handleLinkClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        setPendingNavigation(href);
        setShowExitConfirmModal(true);
      }
    },
    [hasUnsavedChanges]
  );

  const confirmExit = useCallback(() => {
    setShowExitConfirmModal(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [navigate, pendingNavigation]);

  const cancelExit = useCallback(() => {
    setShowExitConfirmModal(false);
    setPendingNavigation(null);
  }, []);

  return (
    <NavigationGuardContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        safeNavigate,
        handleLinkClick,
      }}
    >
      {children}

      {/* Modal de confirmação para sair sem salvar */}
      <Modal
        isOpen={showExitConfirmModal}
        onClose={cancelExit}
        title="Alterações não salvas"
        size="sm"
      >
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-300">
            Você tem alterações não salvas. Deseja sair sem salvar?
          </p>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={cancelExit}>
            Continuar Editando
          </Button>
          <Button variant="danger" onClick={confirmExit}>
            Sair sem Salvar
          </Button>
        </ModalFooter>
      </Modal>
    </NavigationGuardContext.Provider>
  );
}

export { NavigationGuardProvider };
