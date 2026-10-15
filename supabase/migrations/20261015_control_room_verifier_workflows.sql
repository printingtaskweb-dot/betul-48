ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (role IN (
    'citizen',
    'pending_staff',
    'dept_staff',
    'admin',
    'rejected_staff',
    'municipal_administrator',
    'deputy_commissioner',
    'department_head',
    'area_officer',
    'supervisor',
    'field_employee',
    'operational_staff',
    'management_viewer',
    'control_room',
    'verification_officer'
  ));

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS intake_channel text NOT NULL DEFAULT 'citizen'
    CHECK (intake_channel IN ('citizen', 'phone', 'counter'));

CREATE TABLE IF NOT EXISTS public.citizen_callback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  request_type text NOT NULL DEFAULT 'callback' CHECK (request_type IN ('callback', 'appeal')),
  citizen_name text NOT NULL,
  citizen_phone text NOT NULL,
  message text NOT NULL,
  preferred_callback_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'assigned', 'completed', 'no_answer')),
  assigned_to uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  handling_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.complaint_routing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES public.user_profiles(id),
  previous_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  new_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  previous_ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  new_ward_id uuid REFERENCES public.wards(id) ON DELETE SET NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaint_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  referral_type text NOT NULL CHECK (referral_type IN ('internal', 'external')),
  target_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  external_agency text,
  external_reference text,
  notes text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'follow_up', 'resolved', 'closed')),
  referred_by uuid NOT NULL REFERENCES public.user_profiles(id),
  next_follow_up_at timestamptz,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (referral_type = 'internal' AND target_department_id IS NOT NULL)
    OR (referral_type = 'external' AND nullif(trim(external_agency), '') IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (
    request_type IN ('citizen_dissatisfied', 'no_response', 'officer_requested', 'appeal')
  ),
  requested_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reason text,
  deadline_at timestamptz NOT NULL DEFAULT (now() + interval '48 hours'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'awaiting_information', 'completed', 'cancelled')),
  assigned_verifier_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verification_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.verification_requests(id) ON DELETE CASCADE,
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  verifier_id uuid NOT NULL REFERENCES public.user_profiles(id),
  action text NOT NULL CHECK (
    action IN ('rework', 'verified_resolved', 'request_information', 'refer_department')
  ),
  finding text NOT NULL,
  requested_party text CHECK (
    requested_party IS NULL OR requested_party IN ('citizen', 'assigned_officer', 'department_head', 'control_room')
  ),
  target_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  external_agency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    action <> 'refer_department'
    OR target_department_id IS NOT NULL
    OR nullif(trim(external_agency), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS complaints_intake_channel_created_at_idx
  ON public.complaints (intake_channel, created_at DESC);
CREATE INDEX IF NOT EXISTS citizen_callback_requests_status_created_at_idx
  ON public.citizen_callback_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS complaint_referrals_status_follow_up_idx
  ON public.complaint_referrals (status, next_follow_up_at);
CREATE INDEX IF NOT EXISTS verification_requests_queue_idx
  ON public.verification_requests (status, deadline_at);
CREATE INDEX IF NOT EXISTS verification_requests_complaint_idx
  ON public.verification_requests (complaint_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_profile_has_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = ANY (p_roles)
      AND coalesce(approval_status, 'approved') = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.current_profile_has_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_has_role(text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.queue_verification_after_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.verification_requests (complaint_id, request_type, reason, deadline_at)
    SELECT NEW.id, 'no_response', 'Awaiting citizen response', coalesce(
      (SELECT max(resolved_at) FROM public.resolutions WHERE complaint_id = NEW.id), now()
    ) + interval '48 hours'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.verification_requests
      WHERE complaint_id = NEW.id
        AND request_type = 'no_response'
        AND status NOT IN ('completed', 'cancelled')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_verification_after_resolution ON public.complaints;
CREATE TRIGGER queue_verification_after_resolution
  AFTER UPDATE OF status ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.queue_verification_after_resolution();

CREATE OR REPLACE FUNCTION public.queue_verification_after_citizen_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verified_by::text = 'citizen' AND NEW.is_satisfied = false THEN
    INSERT INTO public.verification_requests (complaint_id, request_type, requested_by, reason, deadline_at)
    SELECT NEW.complaint_id, 'citizen_dissatisfied',
      (SELECT created_by FROM public.complaints WHERE id = NEW.complaint_id),
      coalesce(nullif(trim(NEW.note), ''), 'Citizen reported that the issue is not resolved.'), now()
    WHERE NEW.complaint_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.verification_requests
        WHERE complaint_id = NEW.complaint_id
          AND request_type = 'citizen_dissatisfied'
          AND status NOT IN ('completed', 'cancelled')
      );
  END IF;

  IF NEW.verified_by::text = 'citizen' AND NEW.is_satisfied = true THEN
    UPDATE public.verification_requests
    SET status = 'completed', updated_at = now()
    WHERE complaint_id = NEW.complaint_id
      AND request_type = 'no_response'
      AND status IN ('pending', 'in_review', 'awaiting_information');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_verification_after_citizen_feedback ON public.verifications;
CREATE TRIGGER queue_verification_after_citizen_feedback
  AFTER INSERT ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.queue_verification_after_citizen_feedback();

CREATE OR REPLACE FUNCTION public.queue_appeal_after_callback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_type = 'appeal' AND NEW.complaint_id IS NOT NULL THEN
    INSERT INTO public.verification_requests (complaint_id, request_type, requested_by, reason, deadline_at)
    VALUES (NEW.complaint_id, 'appeal', NEW.created_by, NEW.message, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_appeal_after_callback ON public.citizen_callback_requests;
CREATE TRIGGER queue_appeal_after_callback
  AFTER INSERT ON public.citizen_callback_requests
  FOR EACH ROW EXECUTE FUNCTION public.queue_appeal_after_callback();

CREATE OR REPLACE FUNCTION public.prevent_control_room_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND public.current_profile_has_role(ARRAY['control_room']) THEN
    RAISE EXCEPTION 'Control Room cannot record verification or citizen satisfaction';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_control_room_verification ON public.verifications;
CREATE TRIGGER prevent_control_room_verification
  BEFORE INSERT OR UPDATE ON public.verifications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_control_room_verification();

CREATE OR REPLACE FUNCTION public.prevent_control_room_verified_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND public.current_profile_has_role(ARRAY['control_room'])
    AND NEW.status = 'verified' THEN
    IF TG_OP = 'INSERT' THEN
      RAISE EXCEPTION 'Control Room cannot mark a complaint verified';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Control Room cannot mark a complaint verified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_control_room_verified_status ON public.complaints;
CREATE TRIGGER prevent_control_room_verified_status
  BEFORE INSERT OR UPDATE OF status ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.prevent_control_room_verified_status();

INSERT INTO public.verification_requests (complaint_id, request_type, reason, deadline_at)
SELECT c.id, 'no_response', 'Awaiting citizen response', coalesce(
  (SELECT max(r.resolved_at) FROM public.resolutions r WHERE r.complaint_id = c.id), c.updated_at, c.created_at
) + interval '48 hours'
FROM public.complaints c
WHERE c.status = 'resolved'
  AND NOT EXISTS (
    SELECT 1 FROM public.verifications v
    WHERE v.complaint_id = c.id AND v.verified_by::text = 'citizen'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.verification_requests vr
    WHERE vr.complaint_id = c.id AND vr.request_type = 'no_response'
      AND vr.status NOT IN ('completed', 'cancelled')
  );

ALTER TABLE public.citizen_callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_routing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS control_room_insert_complaints ON public.complaints;
CREATE POLICY control_room_insert_complaints ON public.complaints
  FOR INSERT TO authenticated
  WITH CHECK (
    (created_by IS NULL OR created_by = auth.uid())
    AND public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner'])
  );

DROP POLICY IF EXISTS control_room_update_complaints ON public.complaints;
CREATE POLICY control_room_update_complaints ON public.complaints
  FOR UPDATE TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner']))
  WITH CHECK (public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner']));

DROP POLICY IF EXISTS citizen_callback_public_insert ON public.citizen_callback_requests;
CREATE POLICY citizen_callback_public_insert ON public.citizen_callback_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending' AND assigned_to IS NULL AND completed_at IS NULL
    AND (created_by IS NULL OR created_by = auth.uid())
  );

DROP POLICY IF EXISTS citizen_callback_control_room_read ON public.citizen_callback_requests;
CREATE POLICY citizen_callback_control_room_read ON public.citizen_callback_requests
  FOR SELECT TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner']));

DROP POLICY IF EXISTS citizen_callback_control_room_update ON public.citizen_callback_requests;
CREATE POLICY citizen_callback_control_room_update ON public.citizen_callback_requests
  FOR UPDATE TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner']))
  WITH CHECK (public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner']));

DROP POLICY IF EXISTS complaint_routing_control_room_read ON public.complaint_routing_events;
CREATE POLICY complaint_routing_control_room_read ON public.complaint_routing_events
  FOR SELECT TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner']));

DROP POLICY IF EXISTS complaint_routing_control_room_insert ON public.complaint_routing_events;
CREATE POLICY complaint_routing_control_room_insert ON public.complaint_routing_events
  FOR INSERT TO authenticated
  WITH CHECK (
    changed_by = auth.uid()
    AND public.current_profile_has_role(ARRAY['control_room', 'admin', 'municipal_administrator', 'deputy_commissioner'])
  );

DROP POLICY IF EXISTS complaint_referrals_staff_read ON public.complaint_referrals;
CREATE POLICY complaint_referrals_staff_read ON public.complaint_referrals
  FOR SELECT TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner', 'department_head', 'supervisor']));

DROP POLICY IF EXISTS complaint_referrals_staff_insert ON public.complaint_referrals;
CREATE POLICY complaint_referrals_staff_insert ON public.complaint_referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    referred_by = auth.uid()
    AND public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner', 'department_head', 'supervisor'])
  );

DROP POLICY IF EXISTS complaint_referrals_staff_update ON public.complaint_referrals;
CREATE POLICY complaint_referrals_staff_update ON public.complaint_referrals
  FOR UPDATE TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner']))
  WITH CHECK (public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner']));

DROP POLICY IF EXISTS verification_requests_staff_read ON public.verification_requests;
CREATE POLICY verification_requests_staff_read ON public.verification_requests
  FOR SELECT TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner', 'department_head', 'supervisor', 'field_employee', 'dept_staff']));

DROP POLICY IF EXISTS verification_requests_staff_insert ON public.verification_requests;
CREATE POLICY verification_requests_staff_insert ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner', 'department_head', 'supervisor', 'field_employee', 'dept_staff'])
  );

DROP POLICY IF EXISTS verification_requests_verifier_update ON public.verification_requests;
CREATE POLICY verification_requests_verifier_update ON public.verification_requests
  FOR UPDATE TO authenticated
  USING (public.current_profile_has_role(ARRAY['verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner']))
  WITH CHECK (public.current_profile_has_role(ARRAY['verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner']));

DROP POLICY IF EXISTS verification_decisions_staff_read ON public.verification_decisions;
CREATE POLICY verification_decisions_staff_read ON public.verification_decisions
  FOR SELECT TO authenticated
  USING (public.current_profile_has_role(ARRAY['control_room', 'verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner', 'department_head']));

DROP POLICY IF EXISTS verification_decisions_independent_insert ON public.verification_decisions;
CREATE POLICY verification_decisions_independent_insert ON public.verification_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    verifier_id = auth.uid()
    AND public.current_profile_has_role(ARRAY['verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner'])
    AND EXISTS (
      SELECT 1 FROM public.verification_requests vr
      WHERE vr.id = request_id
        AND vr.complaint_id = verification_decisions.complaint_id
        AND vr.assigned_verifier_id = auth.uid()
        AND vr.status IN ('in_review', 'awaiting_information')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.complaints c
      LEFT JOIN public.user_profiles worker ON worker.id = c.assigned_to
      WHERE c.id = verification_decisions.complaint_id
        AND (
          c.assigned_to = auth.uid()
          OR worker.supervisor_id = auth.uid()
          OR c.assigned_by = auth.uid()
        )
    )
  );

CREATE OR REPLACE FUNCTION public.submit_verification_decision(
  p_request_id uuid,
  p_action text,
  p_finding text,
  p_requested_party text DEFAULT NULL,
  p_target_department_id uuid DEFAULT NULL,
  p_external_agency text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.verification_requests%ROWTYPE;
  v_complaint public.complaints%ROWTYPE;
  v_supervisor_id uuid;
  v_decision_id uuid;
BEGIN
  IF v_user_id IS NULL OR NOT public.current_profile_has_role(
    ARRAY['verification_officer', 'admin', 'municipal_administrator', 'deputy_commissioner']
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit verification decisions';
  END IF;

  IF p_action IS NULL OR p_action NOT IN ('rework', 'verified_resolved', 'request_information', 'refer_department') THEN
    RAISE EXCEPTION 'Invalid verification action';
  END IF;
  IF nullif(trim(p_finding), '') IS NULL THEN
    RAISE EXCEPTION 'An independent finding is required';
  END IF;
  IF p_action = 'request_information' AND (
    p_requested_party IS NULL OR p_requested_party NOT IN (
      'citizen', 'assigned_officer', 'department_head', 'control_room'
    )
  ) THEN
    RAISE EXCEPTION 'Select who must provide information';
  END IF;
  IF p_action = 'refer_department' AND p_target_department_id IS NULL
    AND nullif(trim(p_external_agency), '') IS NULL THEN
    RAISE EXCEPTION 'Select an internal department or provide an external agency';
  END IF;

  SELECT * INTO v_request
  FROM public.verification_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND OR v_request.assigned_verifier_id IS DISTINCT FROM v_user_id
    OR v_request.status NOT IN ('in_review', 'awaiting_information') THEN
    RAISE EXCEPTION 'Verification request is not assigned to you';
  END IF;

  SELECT * INTO v_complaint
  FROM public.complaints
  WHERE id = v_request.complaint_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Complaint no longer exists';
  END IF;

  SELECT supervisor_id INTO v_supervisor_id
  FROM public.user_profiles
  WHERE id = v_complaint.assigned_to;
  IF v_complaint.assigned_to = v_user_id
    OR v_supervisor_id = v_user_id
    OR v_complaint.assigned_by = v_user_id THEN
    RAISE EXCEPTION 'You cannot verify a case you worked on, supervised, or assigned';
  END IF;

  IF p_target_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.departments WHERE id = p_target_department_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Destination department is not active';
  END IF;

  INSERT INTO public.verification_decisions (
    request_id, complaint_id, verifier_id, action, finding,
    requested_party, target_department_id, external_agency
  ) VALUES (
    v_request.id, v_complaint.id, v_user_id, p_action, trim(p_finding),
    p_requested_party, p_target_department_id, nullif(trim(p_external_agency), '')
  ) RETURNING id INTO v_decision_id;

  IF p_action = 'rework' THEN
    UPDATE public.complaints SET status = 'in_progress', updated_at = now() WHERE id = v_complaint.id;
  ELSIF p_action = 'verified_resolved' THEN
    UPDATE public.complaints SET status = 'verified', updated_at = now() WHERE id = v_complaint.id;
  ELSIF p_action = 'refer_department' THEN
    INSERT INTO public.complaint_referrals (
      complaint_id, referral_type, target_department_id, external_agency,
      notes, referred_by
    ) VALUES (
      v_complaint.id,
      CASE WHEN p_target_department_id IS NULL THEN 'external' ELSE 'internal' END,
      p_target_department_id,
      nullif(trim(p_external_agency), ''),
      trim(p_finding),
      v_user_id
    );
    IF p_target_department_id IS NOT NULL THEN
      UPDATE public.complaints
        SET department_id = p_target_department_id, status = 'pending',
          assigned_to = NULL, assigned_by = NULL, assigned_at = NULL,
          assignment_notes = NULL, updated_at = now()
      WHERE id = v_complaint.id;
    END IF;
  END IF;

  UPDATE public.verification_requests
  SET status = CASE WHEN p_action = 'request_information' THEN 'awaiting_information' ELSE 'completed' END,
      updated_at = now()
  WHERE id = v_request.id;

  RETURN v_decision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_verification_decision(uuid, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_verification_decision(uuid, text, text, text, uuid, text) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.citizen_callback_requests TO authenticated;
GRANT INSERT ON public.citizen_callback_requests TO anon;
GRANT SELECT, INSERT ON public.complaint_routing_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.complaint_referrals TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT SELECT, INSERT ON public.verification_decisions TO authenticated;