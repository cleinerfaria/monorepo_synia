import { ButtonNew, DatePicker, Modal, ModalFooter } from '@/components/ui';
import PrescriptionPrintModal, {
  type PrescriptionPrintAction,
} from '@/components/prescription/PrescriptionPrintModal';

interface PrescriptionDetailAuxModalsProps {
  isPeriodModalOpen: boolean;
  setIsPeriodModalOpen: (value: boolean) => void;
  periodStartDate: string;
  setPeriodStartDate: (value: string) => void;
  periodEndDate: string;
  setPeriodEndDate: (value: string) => void;
  periodModalError: string;
  setPeriodModalError: (value: string) => void;
  handleSavePeriod: () => void;
  updatePrescriptionIsPending: boolean;
  isDeleteItemModalOpen: boolean;
  setIsDeleteItemModalOpen: (value: boolean) => void;
  handleDeleteItem: () => void;
  deleteItemIsPending: boolean;
  isSuspendItemModalOpen: boolean;
  setIsSuspendItemModalOpen: (value: boolean) => void;
  suspensionEndDate: string;
  setSuspensionEndDate: (value: string) => void;
  handleSuspendItem: () => void;
  suspendItemWithDateIsPending: boolean;
  isPrintModalOpen: boolean;
  setIsPrintModalOpen: (value: boolean) => void;
  setPrintActionInProgress: (value: PrescriptionPrintAction | null) => void;
  canPrintPrescription: boolean;
  handleGeneratePrescriptionPrint: (params: any) => Promise<void>;
  createPrescriptionPrintIsPending: boolean;
  printActionInProgress: PrescriptionPrintAction | null;
}

export function PrescriptionDetailAuxModals({
  isPeriodModalOpen,
  setIsPeriodModalOpen,
  periodStartDate,
  setPeriodStartDate,
  periodEndDate,
  setPeriodEndDate,
  periodModalError,
  setPeriodModalError,
  handleSavePeriod,
  updatePrescriptionIsPending,
  isDeleteItemModalOpen,
  setIsDeleteItemModalOpen,
  handleDeleteItem,
  deleteItemIsPending,
  isSuspendItemModalOpen,
  setIsSuspendItemModalOpen,
  suspensionEndDate,
  setSuspensionEndDate,
  handleSuspendItem,
  suspendItemWithDateIsPending,
  isPrintModalOpen,
  setIsPrintModalOpen,
  setPrintActionInProgress,
  canPrintPrescription,
  handleGeneratePrescriptionPrint,
  createPrescriptionPrintIsPending,
  printActionInProgress,
}: PrescriptionDetailAuxModalsProps) {
  return (
    <>
      <Modal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        title="Alterar Período"
        size="md"
      >
        <div className="space-y-4">
          <DatePicker
            label="Data inicial"
            value={periodStartDate}
            onChange={(event: any) => {
              const nextValue = typeof event === 'string' ? event : event.target.value;
              setPeriodStartDate(nextValue);
              if (periodModalError) setPeriodModalError('');
            }}
          />

          <DatePicker
            label="Data final"
            value={periodEndDate}
            min={periodStartDate || undefined}
            onChange={(event: any) => {
              const nextValue = typeof event === 'string' ? event : event.target.value;
              setPeriodEndDate(nextValue);
              if (periodModalError) setPeriodModalError('');
            }}
          />
          <div>
            <ButtonNew
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPeriodEndDate('');
                if (periodModalError) setPeriodModalError('');
              }}
              disabled={!periodEndDate}
              showIcon={false}
              label="Limpar data final"
            />
          </div>

          {periodModalError && <p className="text-sm text-red-500">{periodModalError}</p>}
        </div>

        <ModalFooter>
          <ButtonNew
            type="button"
            variant="neutral"
            onClick={() => setIsPeriodModalOpen(false)}
            showIcon={false}
            label="Cancelar"
          />
          <ButtonNew
            type="button"
            onClick={handleSavePeriod}
            disabled={updatePrescriptionIsPending}
            showIcon={false}
            label={updatePrescriptionIsPending ? 'Salvando período...' : 'Salvar período'}
          />
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isDeleteItemModalOpen}
        onClose={() => setIsDeleteItemModalOpen(false)}
        title="Remover Item"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja remover este item da prescrição?
        </p>

        <ModalFooter>
          <ButtonNew
            type="button"
            variant="neutral"
            onClick={() => setIsDeleteItemModalOpen(false)}
            showIcon={false}
            label="Cancelar"
          />
          <ButtonNew
            type="button"
            variant="danger"
            onClick={handleDeleteItem}
            disabled={deleteItemIsPending}
            showIcon={false}
            label={deleteItemIsPending ? 'Removendo...' : 'Remover'}
          />
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isSuspendItemModalOpen}
        onClose={() => setIsSuspendItemModalOpen(false)}
        title="Suspender Medicação"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Informe a data final para suspender este item da prescrição.
          </p>

          <div>
            <DatePicker
              label="Data Final de Suspensão"
              value={suspensionEndDate}
              onChange={(event: any) => {
                const nextValue = typeof event === 'string' ? event : event.target.value;
                setSuspensionEndDate(nextValue);
              }}
              required
            />
          </div>
        </div>

        <ModalFooter>
          <ButtonNew
            type="button"
            variant="neutral"
            onClick={() => setIsSuspendItemModalOpen(false)}
            showIcon={false}
            label="Cancelar"
          />
          <ButtonNew
            type="button"
            variant="neutral"
            onClick={handleSuspendItem}
            showIcon={false}
            disabled={suspendItemWithDateIsPending || !suspensionEndDate}
            label={suspendItemWithDateIsPending ? 'Suspendendo...' : 'Suspender'}
          />
        </ModalFooter>
      </Modal>

      <PrescriptionPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintActionInProgress(null);
        }}
        canPrint={canPrintPrescription}
        onGenerate={handleGeneratePrescriptionPrint}
        isGenerating={createPrescriptionPrintIsPending}
        generatingAction={printActionInProgress}
      />
    </>
  );
}
