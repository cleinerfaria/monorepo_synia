import { useState, useEffect } from 'react';
import { Modal, Input, Button, Select } from '@/components/ui';
import { usePageCharts } from '@/hooks/usePageCharts';
import toast from 'react-hot-toast';
import type { PageChart, PageChartType, PageChartYAxisConfig } from '../types/database';
import { Plus, Trash2 } from 'lucide-react';
import { CHART_SERIES_COLORS, DEFAULT_COMPANY_COLOR } from '@/lib/themeConstants';

interface PageChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  pageId: string | null;
  pageChart?: PageChart | null;
}

const CHART_TYPES: { value: PageChartType; label: string }[] = [
  { value: 'area', label: 'Área' },
  { value: 'line', label: 'Linha' },
  { value: 'bar', label: 'Barra Horizontal' },
  { value: 'column', label: 'Coluna Vertical' },
  { value: 'pie', label: 'Pizza' },
  { value: 'donut', label: 'Rosquinha' },
  { value: 'stacked_bar', label: 'Barra Empilhada' },
  { value: 'stacked_area', label: 'Área Empilhada' },
  { value: 'scatter', label: 'Dispersão' },
  { value: 'radar', label: 'Radar' },
  { value: 'treemap', label: 'Treemap' },
  { value: 'heatmap', label: 'Mapa de Calor' },
];

const Y_AXIS_FORMATS = [
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'percent', label: 'Porcentagem' },
];

const CURVE_TYPES = [
  { value: 'smooth', label: 'Suave (Bezier)' },
  { value: 'linear', label: 'Linear' },
  { value: 'step', label: 'Escada' },
];

const WIDTH_OPTIONS = [
  { value: 'full', label: 'Largura Total' },
  { value: 'half', label: 'Metade' },
  { value: 'third', label: 'Um Terço' },
  { value: 'quarter', label: 'Um Quarto' },
];

type ChartWidth = 'full' | 'half' | 'third' | 'quarter';

const DEFAULT_COLORS = [DEFAULT_COMPANY_COLOR, ...CHART_SERIES_COLORS];

export default function PageChartModal({
  isOpen,
  onClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  companyId,
  pageId,
  pageChart,
}: PageChartModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    type: 'area' as PageChartType,
    options_view: '',
    x_axis: '',
    y_axis: [{ field: '', label: '', color: DEFAULT_COLORS[0] }] as PageChartYAxisConfig[],
    colors: DEFAULT_COLORS,
    show_legend: true,
    show_grid: true,
    stacked: false,
    curve_type: 'smooth' as 'smooth' | 'linear' | 'step',
    x_axis_format: 'auto' as 'date' | 'datetime' | 'number' | 'currency' | 'auto',
    y_axis_format: 'number' as 'number' | 'currency' | 'percent' | 'auto',
    y_axis_prefix: '',
    y_axis_suffix: '',
    order_index: 0,
    active: true,
    width: 'full' as ChartWidth,
    height: 300,
  });

  const { createPageChart, updatePageChart, isCreating, isUpdating } = usePageCharts(
    pageId || undefined
  );
  const isEditing = !!pageChart;
  const isLoading = isCreating || isUpdating;

  useEffect(() => {
    if (pageChart) {
      setFormData({
        name: pageChart.name,
        title: pageChart.title || '',
        description: pageChart.description || '',
        type: pageChart.type,
        options_view: pageChart.options_view,
        x_axis: pageChart.x_axis,
        y_axis:
          pageChart.y_axis.length > 0
            ? pageChart.y_axis
            : [{ field: '', label: '', color: DEFAULT_COLORS[0] }],
        colors: pageChart.colors || DEFAULT_COLORS,
        show_legend: pageChart.show_legend ?? true,
        show_grid: pageChart.show_grid ?? true,
        stacked: pageChart.stacked ?? false,
        curve_type: pageChart.curve_type || 'smooth',
        x_axis_format: pageChart.x_axis_format || 'auto',
        y_axis_format: pageChart.y_axis_format || 'number',
        y_axis_prefix: pageChart.y_axis_prefix || '',
        y_axis_suffix: pageChart.y_axis_suffix || '',
        order_index: pageChart.order_index || 0,
        active: pageChart.active ?? true,
        width: pageChart.width || 'full',
        height: pageChart.height || 300,
      });
    } else {
      setFormData({
        name: '',
        title: '',
        description: '',
        type: 'area',
        options_view: '',
        x_axis: '',
        y_axis: [{ field: '', label: '', color: DEFAULT_COLORS[0] }],
        colors: DEFAULT_COLORS,
        show_legend: true,
        show_grid: true,
        stacked: false,
        curve_type: 'smooth',
        x_axis_format: 'auto',
        y_axis_format: 'number',
        y_axis_prefix: '',
        y_axis_suffix: '',
        order_index: 0,
        active: true,
        width: 'full',
        height: 300,
      });
    }
  }, [pageChart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pageId) {
      toast.error('Selecione uma página primeiro');
      return;
    }

    if (!formData.options_view) {
      toast.error('Informe a view de dados');
      return;
    }

    if (!formData.x_axis) {
      toast.error('Informe o campo do eixo X');
      return;
    }

    if (!formData.y_axis[0]?.field) {
      toast.error('Informe pelo menos um campo para o eixo Y');
      return;
    }

    try {
      const chartData = {
        name: formData.name,
        title: formData.title || undefined,
        description: formData.description || undefined,
        type: formData.type,
        options_view: formData.options_view,
        x_axis: formData.x_axis,
        y_axis: formData.y_axis.filter((y) => y.field),
        colors: formData.colors,
        show_legend: formData.show_legend,
        show_grid: formData.show_grid,
        stacked: formData.stacked,
        curve_type: formData.curve_type,
        x_axis_format: formData.x_axis_format,
        y_axis_format: formData.y_axis_format,
        y_axis_prefix: formData.y_axis_prefix || undefined,
        y_axis_suffix: formData.y_axis_suffix || undefined,
        order_index: formData.order_index,
        active: formData.active,
        width: formData.width,
        height: formData.height,
      };

      if (isEditing && pageChart) {
        await updatePageChart({
          id: pageChart.id,
          updates: chartData,
        });
        toast.success('Gráfico atualizado com sucesso!');
      } else {
        await createPageChart({
          page_id: pageId,
          ...chartData,
        });
        toast.success('Gráfico criado com sucesso!');
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} gráfico`);
    }
  };

  const addYAxisField = () => {
    const nextColor = DEFAULT_COLORS[formData.y_axis.length % DEFAULT_COLORS.length];
    setFormData((prev) => ({
      ...prev,
      y_axis: [...prev.y_axis, { field: '', label: '', color: nextColor }],
    }));
  };

  const removeYAxisField = (index: number) => {
    if (formData.y_axis.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      y_axis: prev.y_axis.filter((_, i) => i !== index),
    }));
  };

  const updateYAxisField = (index: number, key: keyof PageChartYAxisConfig, value: string) => {
    setFormData((prev) => ({
      ...prev,
      y_axis: prev.y_axis.map((y, i) => (i === index ? { ...y, [key]: value } : y)),
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Gráfico' : 'Novo Gráfico'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
        {/* Seção: Informações Básicas */}
        <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
          <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Informações Básicas</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome (identificador)
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="ex: faturamento_mensal"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Select
                label="Tipo de Gráfico"
                options={CHART_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={formData.type}
                onChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, type: value as PageChartType }))
                }
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Título do Gráfico
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="ex: Faturamento Mensal"
              disabled={isLoading}
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </label>
            <Input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="ex: Evolução do faturamento ao longo dos meses"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Seção: Fonte de Dados */}
        <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
          <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Fonte de Dados</h4>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              View de Dados
            </label>
            <Input
              type="text"
              value={formData.options_view}
              onChange={(e) => setFormData((prev) => ({ ...prev, options_view: e.target.value }))}
              placeholder="ex: vw_faturamento_mensal"
              required
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Nome da view no banco de dados que retornará os dados do gráfico
            </p>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Eixo X (Campo)
            </label>
            <Input
              type="text"
              value={formData.x_axis}
              onChange={(e) => setFormData((prev) => ({ ...prev, x_axis: e.target.value }))}
              placeholder="ex: mes, data, categoria"
              required
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Nome do campo da view usado no eixo horizontal
            </p>
          </div>
        </div>

        {/* Seção: Séries (Eixo Y) */}
        <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">Séries (Eixo Y)</h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addYAxisField}
              disabled={isLoading}
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar Série
            </Button>
          </div>

          <div className="space-y-3">
            {formData.y_axis.map((yAxis, index) => (
              <div
                key={index}
                className="flex items-end gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Campo
                  </label>
                  <Input
                    type="text"
                    value={yAxis.field}
                    onChange={(e) => updateYAxisField(index, 'field', e.target.value)}
                    placeholder="ex: valor_total"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Rótulo
                  </label>
                  <Input
                    type="text"
                    value={yAxis.label}
                    onChange={(e) => updateYAxisField(index, 'label', e.target.value)}
                    placeholder="ex: Faturamento"
                    disabled={isLoading}
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Cor
                  </label>
                  <input
                    type="color"
                    value={yAxis.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                    onChange={(e) => updateYAxisField(index, 'color', e.target.value)}
                    className="h-10 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                    disabled={isLoading}
                  />
                </div>
                {formData.y_axis.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeYAxisField(index)}
                    disabled={isLoading}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seção: Formatação */}
        <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
          <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Formatação</h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Select
                label="Formato do Eixo Y"
                options={Y_AXIS_FORMATS.map((f) => ({ value: f.value, label: f.label }))}
                value={formData.y_axis_format}
                onChange={(value: string) =>
                  setFormData((prev) => ({
                    ...prev,
                    y_axis_format: value as 'number' | 'currency' | 'percent' | 'auto',
                  }))
                }
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prefixo
              </label>
              <Input
                type="text"
                value={formData.y_axis_prefix}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, y_axis_prefix: e.target.value }))
                }
                placeholder="ex: R$ "
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sufixo
              </label>
              <Input
                type="text"
                value={formData.y_axis_suffix}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, y_axis_suffix: e.target.value }))
                }
                placeholder="ex: %"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="mt-4">
            <Select
              label="Tipo de Curva"
              options={CURVE_TYPES.map((c) => ({ value: c.value, label: c.label }))}
              value={formData.curve_type}
              onChange={(value: string) =>
                setFormData((prev) => ({
                  ...prev,
                  curve_type: value as 'smooth' | 'linear' | 'step',
                }))
              }
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Seção: Aparência */}
        <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
          <h4 className="mb-3 font-medium text-gray-900 dark:text-white">Aparência</h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Select
                label="Largura"
                options={WIDTH_OPTIONS.map((w) => ({ value: w.value, label: w.label }))}
                value={formData.width}
                onChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, width: value as ChartWidth }))
                }
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Altura (px)
              </label>
              <Input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, height: parseInt(e.target.value) || 300 }))
                }
                min={200}
                max={800}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ordem
              </label>
              <Input
                type="number"
                value={formData.order_index}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))
                }
                min={0}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.show_legend}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, show_legend: e.target.checked }))
                }
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar Legenda</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.show_grid}
                onChange={(e) => setFormData((prev) => ({ ...prev, show_grid: e.target.checked }))}
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Mostrar Grid</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.stacked}
                onChange={(e) => setFormData((prev) => ({ ...prev, stacked: e.target.checked }))}
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Empilhado</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Ativo</span>
            </label>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditing ? 'Salvar Alterações' : 'Criar Gráfico'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
