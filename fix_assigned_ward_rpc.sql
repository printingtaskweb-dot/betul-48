BEGIN;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS assigned_ward_id uuid
  REFERENCES public.wards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_profiles_assigned_ward_id_idx
  ON public.user_profiles(assigned_ward_id);

CREATE OR REPLACE FUNCTION public.assign_profile_ward(
  p_user_id uuid,
  p_ward_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor public.user_profiles%ROWTYPE;
  v_target public.user_profiles%ROWTYPE;
  v_actor_code text;
  v_target_code text;
  v_citywide boolean;
BEGIN
  SELECT * INTO v_actor
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF NOT FOUND OR coalesce(v_actor.approval_status, 'approved') <> 'approved' THEN
    RAISE EXCEPTION 'Not authorized to assign wards';
  END IF;

  v_actor_code := lower(coalesce(
    nullif(v_actor.hierarchy_code, ''),
    nullif(v_actor.authority_role, ''),
    v_actor.role,
    ''
  ));
  v_citywide := v_actor.is_admin IS TRUE
    OR v_actor_code IN ('admin', 'municipal_administrator', 'municipal_commissioner', 'commissioner', 'organisation_head')
    OR v_actor_code LIKE 'deputy_comm%'
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'ouikey41@gmail.com';

  IF NOT v_citywide AND v_actor_code NOT IN ('department_head', 'dept_head') THEN
    RAISE EXCEPTION 'Only municipal leadership or department heads can assign wards';
  END IF;

  SELECT * INTO v_target
  FROM public.user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND OR coalesce(v_target.role, 'citizen') IN (
    'citizen', 'pending_staff', 'rejected_staff', 'control_room', 'verification_officer'
  ) THEN
    RAISE EXCEPTION 'Select an active department staff member';
  END IF;

  IF NOT v_citywide AND (
    v_actor.linked_department_id IS NULL
    OR v_target.linked_department_id IS DISTINCT FROM v_actor.linked_department_id
  ) THEN
    RAISE EXCEPTION 'Department heads can only assign wards within their own department';
  END IF;

  v_target_code := lower(coalesce(
    nullif(v_target.hierarchy_code, ''),
    nullif(v_target.authority_role, ''),
    v_target.role,
    ''
  ));
  IF NOT v_citywide AND v_target_code NOT IN (
    'area_officer', 'supervisor', 'field_employee', 'operational_staff', 'dept_staff'
  ) THEN
    RAISE EXCEPTION 'Department heads can only assign wards to area officers, supervisors, or operational staff';
  END IF;

  IF p_ward_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.wards WHERE id = p_ward_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Select an active registered ward';
  END IF;

  UPDATE public.user_profiles
  SET assigned_ward_id = p_ward_id
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_profile_ward(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_profile_ward(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name = 'assigned_ward_id';

SELECT to_regprocedure('public.assign_profile_ward(uuid,uuid)') AS assigned_ward_rpc;