import { ButtonNew, Input, SearchableSelect } from '@/components/ui';
import { Pencil, Pill, Trash2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

interface PrescriptionDetailModalComponentsTabProps {
  activeModalTab: 'item' | 'components' | 'optionals';
  componentProductOptions: Array<{ value: string; label: string }>;
  selectedComponentProductId: string;
  setSelectedComponentProductId: (value: string) => void;
  setComponentProductSearchTerm: (value: string) => void;
  componentProductsIsLoading: boolean;
  debouncedComponentSearch: string;
  selectedComponentQuantity: number | string;
  setSelectedComponentQuantity: Dispatch<SetStateAction<number | ''>>;
  componentProducts: any[];
  localComponents: any[];
  setLocalComponents: (updater: (prev: any[]) => any[]) => void;
  selectedItem: any;
  addComponent: { mutate: (payload: any) => void };
  editingComponentIndex: number | null;
  setEditingComponentIndex: (value: number | null) => void;
  updateComponent: { mutate: (payload: any) => void };
  deleteComponent: { mutate: (payload: any) => void };
}

export function PrescriptionDetailModalComponentsTab({
  activeModalTab,
  componentProductOptions,
  selectedComponentProductId,
  setSelectedComponentProductId,
  setComponentProductSearchTerm,
  componentProductsIsLoading,
  debouncedComponentSearch,
  selectedComponentQuantity,
  setSelectedComponentQuantity,
  componentProducts,
  localComponents,
  setLocalComponents,
  selectedItem,
  addComponent,
  editingComponentIndex,
  setEditingComponentIndex,
  updateComponent,
  deleteComponent,
}: PrescriptionDetailModalComponentsTabProps) {
  if (activeModalTab !== 'components') return null;

  return (
    <div className="space-y-6 p-2">
      <div className="border-primary-300 from-primary-50/50 to-primary-100/30 dark:border-primary-700 dark:from-primary-900/20 dark:to-primary-800/10 rounded-xl border-2 border-dashed bg-gradient-to-br p-5">
        <div className="space-y-4">
          <SearchableSelect
            label="Produto"
            options={componentProductOptions}
            placeholder="Buscar e selecionar produto..."
            searchPlaceholder="Buscar por produto ou apresentação..."
            value={selectedComponentProductId}
            onChange={(e: any) => setSelectedComponentProductId(e.target.value)}
            onSearch={(term: string) => setComponentProductSearchTerm(term)}
            isLoading={componentProductsIsLoading}
            emptyMessage={
              debouncedComponentSearch.trim() !== ''
                ? 'Nenhum produto encontrado'
                : 'Digite para buscar produtos'
            }
          />

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4">
              <Input
                label="Quantidade"
                type="number"
                placeholder="0"
                inputMode="numeric"
                value={selectedComponentQuantity}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedComponentQuantity(value === '' ? '' : parseFloat(value));
                }}
              />
            </div>
            <div className="col-span-3">
              <Input
                label="Unidade"
                value={(() => {
                  const product = componentProducts.find(
                    (p) => p.id === selectedComponentProductId
                  );
                  if (!product) return '--';
                  const productData = product as any;
                  return productData?.unit_prescription?.symbol || 'UN';
                })()}
                placeholder="--"
                readOnly
                disabled
              />
            </div>
            <div className="col-span-5 flex items-end">
              <ButtonNew
                type="button"
                onClick={() => {
                  if (!selectedComponentProductId) return;

                  const product = componentProducts.find(
                    (p) => p.id === selectedComponentProductId
                  );
                  const productData = product as any;

                  if (localComponents.some((c) => c.product_id === selectedComponentProductId)) {
                    setSelectedComponentProductId('');
                    setSelectedComponentQuantity('');
                    return;
                  }

                  const quantity =
                    typeof selectedComponentQuantity === 'number'
                      ? selectedComponentQuantity
                      : null;

                  const newComponent = {
                    product_id: selectedComponentProductId,
                    quantity: quantity,
                    product: product
                      ? {
                          id: product.id,
                          name: product.name,
                          concentration: product.concentration,
                          unit_stock: productData?.unit_stock || null,
                          unit_prescription: productData?.unit_prescription || null,
                        }
                      : null,
                    isNew: true,
                  };

                  if (selectedItem?.id) {
                    addComponent.mutate({
                      prescription_item_id: selectedItem.id,
                      product_id: selectedComponentProductId,
                      quantity: quantity,
                    });
                  } else {
                    setLocalComponents((prev) => [...prev, newComponent]);
                  }

                  setSelectedComponentProductId('');
                  setSelectedComponentQuantity('');
                }}
                disabled={!selectedComponentProductId}
                className="w-full"
                label="Adicionar a Lista"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Componentes Adicionados
          </h4>
          {localComponents.length > 0 && (
            <span className="bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">
              {localComponents.length} {localComponents.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {localComponents.length > 0 ? (
          <div className="space-y-2">
            {localComponents.map((component, index) => {
              const componentProduct = componentProducts.find((p) => p.id === component.product_id);
              const componentProductData = componentProduct as any;
              const localProductData = component.product as any;
              const productName =
                componentProduct?.name || component.product?.name || 'Produto não encontrado';
              const concentration =
                componentProduct?.concentration || component.product?.concentration || '';
              const unitSymbol =
                componentProductData?.unit_prescription?.symbol ||
                componentProductData?.unit_stock?.symbol ||
                localProductData?.unit_prescription?.symbol ||
                localProductData?.unit_stock?.symbol ||
                'UN';
              const isEditing = editingComponentIndex === index;

              return (
                <div
                  key={component.id || `new-${index}`}
                  className="hover:border-primary-300 dark:hover:border-primary-600 group relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-primary-500 w-6 flex-shrink-0 text-sm font-bold">
                      {index + 1}.
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {productName}
                        {concentration && (
                          <span className="ml-2 font-normal text-gray-500 dark:text-gray-400">
                            {concentration}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="0"
                            className="w-20 text-center"
                            value={component.quantity ?? ''}
                            autoFocus
                            onChange={(e) => {
                              const newQuantity = e.target.value
                                ? parseFloat(e.target.value)
                                : null;
                              setLocalComponents((prev) =>
                                prev.map((c, i) =>
                                  i === index ? { ...c, quantity: newQuantity } : c
                                )
                              );
                            }}
                            onBlur={() => {
                              if (component.id && !component.isNew) {
                                updateComponent.mutate({
                                  id: component.id,
                                  prescriptionItemId: selectedItem?.id || '',
                                  quantity: component.quantity,
                                });
                              }
                              setEditingComponentIndex(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (component.id && !component.isNew) {
                                  updateComponent.mutate({
                                    id: component.id,
                                    prescriptionItemId: selectedItem?.id || '',
                                    quantity: component.quantity,
                                  });
                                }
                                setEditingComponentIndex(null);
                              }
                              if (e.key === 'Escape') {
                                setEditingComponentIndex(null);
                              }
                            }}
                          />
                          <span className="text-xs font-medium text-gray-500">{unitSymbol}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingComponentIndex(index)}
                          className="hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-500 dark:hover:bg-primary-900/20 flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm transition-all dark:border-gray-600 dark:bg-gray-700"
                        >
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {component.quantity ?? '--'}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {unitSymbol}
                          </span>
                          <Pencil className="ml-1 h-3 w-3 text-gray-400" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (component.id && !component.isNew) {
                            deleteComponent.mutate({
                              id: component.id,
                              prescriptionItemId: selectedItem?.id || '',
                            });
                          }
                          setLocalComponents((prev) => prev.filter((_, i) => i !== index));
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-gray-400 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 dark:hover:border-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/30">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
              <Pill className="h-6 w-6 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Nenhum componente adicionado
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Use o formulario acima para adicionar produtos a administracao
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
