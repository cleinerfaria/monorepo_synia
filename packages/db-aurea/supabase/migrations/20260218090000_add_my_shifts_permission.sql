INSERT INTO public.system_module (code, name, description, icon, display_order, active)
VALUES (
  'my_shifts',
  'Meu Plantão',
  'Acesso à página Meu Plantão para check-in e check-out de plantão',
  'ClockIcon',
  13,
  TRUE
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  active = TRUE;

INSERT INTO public.module_permission (module_id, code, name, description)
SELECT
  sm.id,
  'view',
  'Acessar',
  'Acessar a página Meu Plantão'
FROM public.system_module sm
WHERE sm.code = 'my_shifts'
ON CONFLICT (module_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO public.access_profile_permission (profile_id, permission_id)
SELECT
  ap.id,
  mp.id
FROM public.access_profile ap
JOIN public.system_module sm ON sm.code = 'my_shifts'
JOIN public.module_permission mp ON mp.module_id = sm.id AND mp.code = 'view'
WHERE ap.code = 'shift_only' AND ap.active = TRUE
ON CONFLICT (profile_id, permission_id) DO NOTHING;
