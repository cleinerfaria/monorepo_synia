import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type {
  ScheduleAssignment,
  ScheduleProfessional,
  UpsertSchedulePayload,
  PatientMonthSchedule,
  ScheduleRegime,
} from '@/types/schedule';
import toast from 'react-hot-toast';

const SCHEDULE_KEY = 'patient_month_schedule';
const SCHEDULE_PROFESSIONALS_KEY = 'schedule_professionals';

// =====================================================
// Query: Buscar escala mensal do paciente
// =====================================================

export function usePatientMonthSchedule(
  patientId: string | undefined,
  year: number,
  month: number
) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [SCHEDULE_KEY, company?.id, patientId, year, month],
    queryFn: async (): Promise<PatientMonthSchedule | null> => {
      if (!company?.id || !patientId) return null;

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Buscar plantoes do mes
      const { data, error } = await supabase
        .from('patient_attendance_shift')
        .select('id, start_at, end_at, assigned_professional_id, status')
        .eq('company_id', company.id)
        .eq('patient_id', patientId)
        .gte('start_at', `${startDate}T00:00:00`)
        .lte('start_at', `${endDate}T23:59:59`)
        .order('start_at');

      if (error) throw error;

      // Buscar PAD ativo do paciente para obter regime e start_time
      const { data: padData } = await supabase
        .from('patient_attendance_demand')
        .select('id, start_date, hours_per_day, start_time, is_split')
        .eq('company_id', company.id)
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hoursPerDay = padData?.hours_per_day ?? 24;
      const startTime = padData?.start_time ?? '07:00';
      let regime: ScheduleRegime = '24h';
      if (hoursPerDay === 12 || (hoursPerDay === 24 && padData?.is_split)) {
        regime = '12h';
      } else if (hoursPerDay === 8) {
        regime = '8h';
      }

      const assignments: ScheduleAssignment[] = (data || [])
        .filter((shift: any) => shift.assigned_professional_id)
        .map((shift: any) => ({
          id: shift.id,
          date: shift.start_at.slice(0, 10),
          professional_id: shift.assigned_professional_id,
          start_at: shift.start_at,
          end_at: shift.end_at,
        }));

      return {
        patient_id: patientId,
        pad_id: padData?.id ?? null,
        start_date: padData?.start_date ?? null,
        year,
        month,
        regime,
        start_time: startTime,
        assignments,
      };
    },
    enabled: !!company?.id && !!patientId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// Query: Listar profissionais disponiveis da empresa
// =====================================================

export function useScheduleProfessionals() {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: [SCHEDULE_PROFESSIONALS_KEY, company?.id],
    queryFn: async (): Promise<ScheduleProfessional[]> => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from('professional')
        .select('id, name, profession_id, active, email, phone')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        role: null,
        active: p.active ?? false,
        email: p.email,
        phone: p.phone,
        color: null,
        is_substitute: false,
      }));
    },
    enabled: !!company?.id,
    staleTime: 10 * 60 * 1000,
  });
}

// =====================================================
// Mutation: Salvar escala mensal (upsert em lote)
// =====================================================

export function useSaveSchedule() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: UpsertSchedulePayload) => {
      if (!company?.id) throw new Error('No company');

      // Tentar via RPC se disponivel
      const { error } = await supabase.rpc('upsert_patient_month_schedule', {
        p_company_id: company.id,
        p_patient_id: payload.patient_id,
        p_year: payload.year,
        p_month: payload.month,
        p_assignments: JSON.stringify(payload.assignments),
      });

      if (error) {
        // Fallback: se RPC nao existe, usar upsert direto nos shifts
        if (
          error.message?.includes('function') ||
          error.code === '42883' ||
          error.code === 'PGRST202' ||
          error.message?.includes('404')
        ) {
          for (const assignment of payload.assignments) {
            // Tentar atualizar shift existente
            const { data: existing } = await supabase
              .from('patient_attendance_shift')
              .select('id')
              .eq('company_id', company.id)
              .eq('patient_id', payload.patient_id)
              .eq('start_at', assignment.start_at)
              .limit(1)
              .maybeSingle();

            if (existing) {
              const { error: updateErr } = await supabase
                .from('patient_attendance_shift')
                .update({
                  assigned_professional_id: assignment.professional_id,
                  start_at: assignment.start_at,
                  end_at: assignment.end_at,
                })
                .eq('id', existing.id);

              if (updateErr) throw updateErr;
            } else {
              const { error: insertErr } = await supabase.from('patient_attendance_shift').insert({
                company_id: company.id,
                patient_id: payload.patient_id,
                patient_attendance_demand_id: payload.pad_id,
                start_at: assignment.start_at,
                end_at: assignment.end_at,
                assigned_professional_id: assignment.professional_id,
                status: 'planned',
              } as any);

              if (insertErr) throw insertErr;
            }
          }

          return;
        }

        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          SCHEDULE_KEY,
          company?.id,
          variables.patient_id,
          variables.year,
          variables.month,
        ],
      });
      toast.success('Escala salva com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving schedule:', error);
      const message = error instanceof Error ? error.message : 'Erro ao salvar escala';
      toast.error(message);
    },
  });
}

// =====================================================
// Query: Buscar dados do paciente (nome para header)
// =====================================================

export function useSchedulePatient(patientId: string | undefined) {
  const { company } = useAuthStore();

  return useQuery({
    queryKey: ['schedule_patient', company?.id, patientId],
    queryFn: async () => {
      if (!company?.id || !patientId) return null;

      const { data, error } = await supabase
        .from('patient')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data as { id: string; name: string };
    },
    enabled: !!company?.id && !!patientId,
  });
}
