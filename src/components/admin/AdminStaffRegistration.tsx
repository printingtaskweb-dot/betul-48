import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import {
  Mail, ShieldCheck, ArrowRight, User, Phone, ChevronDown, ChevronLeft,
  Search, MapPin, X, BadgeCheck, Briefcase, Crown, Copy, Wand2, Plus,
} from 'lucide-react';
import { FormInput } from '../auth/FormInput';
import { PasswordInput } from '../auth/PasswordInput';
import { AlertBanner } from '../auth/AlertBanner';

/* Separate client: creating the new user must NOT replace the admin's session */
const provisionClient = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string) || supabaseUrl,
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-admin-provision',
    },
  },
);

interface Department { id: string; name: string; slug: string; icon: string; }
interface City { id: string; name: string; state: string | null; slug: string | null; }
interface Designation {
  designation_id: string; tier: number; name: string; name_hi: string | null;
  hierarchy_code: string | null; maps_to_role: string | null;
}
interface StaffMatch {
  id: string; full_name: string | null; role: string; hierarchy_code: string | null;
  staff_code: string | null; department_name: string | null; designation_name: string | null;
}

type Stage = 'account' | 'city' | 'role' | 'level' | 'officer' | 'details' | 'done';

const MANUAL_CITIES = [
  { key: 'indore', name: 'Indore' },
  { key: 'bhopal', name: 'Bhopal' },
  { key: 'betul', name: 'Betul' },
  { key: 'chhindwara', name: 'Chhindwara' },
];

const genPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
};

const S = {
  label: { display: 'block', fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, color: 'var(--gray-700)' } as React.CSSProperties,
  select: { width: '100%', padding: '11px 36px 11px 40px', border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: 'var(--theme-bg, #fff4e7)', outline: 'none', boxSizing: 'border-box', appearance: 'none', cursor: 'pointer' } as React.CSSProperties,
  input: { width: '100%', padding: '11px 14px 11px 40px', border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', background: 'var(--theme-bg, #fff4e7)', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
  btnPrimary: { width: '100%', padding: 13, border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))', color: '#fff', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 } as React.CSSProperties,
  btnSecondary: { padding: '11px 16px', border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', background: 'var(--theme-bg, #fff4e7)', color: 'var(--gray-700)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 } as React.CSSProperties,
  row: { padding: '10px 12px', border: 'none', borderBottom: '1px solid var(--theme-component-border, #bfbfbf)', background: 'var(--theme-component, #d9d9d9)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' } as React.CSSProperties,
  h2: { margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 900 } as React.CSSProperties,
  sub: { margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--gray-500)' } as React.CSSProperties,
};

interface Props { onDone?: () => void; }

export default function AdminStaffRegistration({ onDone }: Props) {
  const [stage, setStage] = useState<Stage>('account');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [roleKey, setRoleKey] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesig, setSelectedDesig] = useState<Designation | null>(null);
  const [supervisor, setSupervisor] = useState<StaffMatch | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<StaffMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [cities, setCities] = useState<City[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; staffCode?: string } | null>(null);

const DEPARTMENT_DESIGNATIONS_MAP: Record<string, Designation[]> = {
  sanitation: [
    { designation_id: 'default-san-1', tier: 1, name: 'Health / Sanitation Officer', name_hi: 'स्वास्थ्य / स्वच्छता अधिकारी', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-san-2', tier: 2, name: 'Zone / Ward Sanitary Inspector', name_hi: 'जोन / वार्ड स्वच्छता निरीक्षक', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-san-3', tier: 3, name: 'Sanitation Supervisor', name_hi: 'स्वच्छता पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-san-4', tier: 4, name: 'Sanitation Workers / Collection Crew', name_hi: 'सफाई कर्मचारी / कचरा संग्रहण दल', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  water: [
    { designation_id: 'default-wat-1', tier: 1, name: 'Water / Sewerage Department Head', name_hi: 'जल प्रदाय एवं सीवरेज विभाग प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-wat-2', tier: 2, name: 'Area Assistant / Junior Engineer', name_hi: 'क्षेत्रीय सहायक / कनिष्ठ यंत्री', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-wat-3', tier: 3, name: 'Pipeline / Pump Supervisor', name_hi: 'पाइपलाइन / पंप पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-wat-4', tier: 4, name: 'Plumbers / Pump Operators / Sewer Crew', name_hi: 'प्लंबर / पंप ऑपरेटर / सीवर टीम', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  roads: [
    { designation_id: 'default-rd-1', tier: 1, name: 'Public Works / Engineering Head', name_hi: 'लोक निर्माण / इंजीनियरिंग प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-rd-2', tier: 2, name: 'Assistant / Junior Engineer', name_hi: 'सहायक / कनिष्ठ यंत्री (सिविल)', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-rd-3', tier: 3, name: 'Site Supervisor', name_hi: 'साइट पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-rd-4', tier: 4, name: 'Masons / Repair Crew / Contractor Team', name_hi: 'मिस्त्री / मरम्मत दल / ठेकेदार टीम', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  electricity: [
    { designation_id: 'default-el-1', tier: 1, name: 'Electrical Department Head', name_hi: 'विद्युत विभाग प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-el-2', tier: 2, name: 'Area Electrical Engineer', name_hi: 'क्षेत्रीय विद्युत अभियंता', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-el-3', tier: 3, name: 'Electrical Supervisor', name_hi: 'विद्युत पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-el-4', tier: 4, name: 'Electricians / Lineworkers / Helpers', name_hi: 'इलेक्ट्रीशियन / लाइनमैन / सहायक', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  parks: [
    { designation_id: 'default-pk-1', tier: 1, name: 'Horticulture Department Head', name_hi: 'उद्यान विभाग प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-pk-2', tier: 2, name: 'Area Horticulture Officer', name_hi: 'क्षेत्रीय उद्यान अधिकारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-pk-3', tier: 3, name: 'Park / Garden Supervisor', name_hi: 'उद्यान पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-pk-4', tier: 4, name: 'Gardeners / Maintenance Staff', name_hi: 'माली / रख-रखाव कर्मचारी', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  encroachment: [
    { designation_id: 'default-enc-1', tier: 1, name: 'Building / Planning / Enforcement Head', name_hi: 'भवन अनुज्ञा एवं अतिक्रमण विरोधी प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-enc-2', tier: 2, name: 'Building Officer / Area Inspector', name_hi: 'भवन अधिकारी / क्षेत्रीय निरीक्षक', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-enc-3', tier: 3, name: 'Inspection / Enforcement Supervisor', name_hi: 'प्रवर्तन पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-enc-4', tier: 4, name: 'Surveyors / Inspectors / Field Crew', name_hi: 'सर्वेयर / फील्ड दल', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  revenue: [
    { designation_id: 'default-rev-1', tier: 1, name: 'Revenue Officer', name_hi: 'राजस्व अधिकारी', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-rev-2', tier: 2, name: 'Area Revenue Inspector', name_hi: 'क्षेत्रीय राजस्व निरीक्षक (RI)', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-rev-3', tier: 3, name: 'Tax / Collection Supervisor', name_hi: 'कर / वसूली पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-rev-4', tier: 4, name: 'Tax Assistants / Billing / Collection Staff', name_hi: 'कर सहायक / बिलिंग व वसूली स्टाफ', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  accounts: [
    { designation_id: 'default-acc-1', tier: 1, name: 'Finance / Accounts Head', name_hi: 'वित्त एवं लेखा प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-acc-2', tier: 2, name: 'Accounts Officer / Stores In-charge', name_hi: 'लेखा अधिकारी / स्टोर प्रभारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-acc-3', tier: 3, name: 'Accountant / Storekeeper', name_hi: 'लेखाकार / स्टोरकीपर', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-acc-4', tier: 4, name: 'Accounts Assistants / Inventory Staff', name_hi: 'लेखा सहायक / इन्वेंटरी स्टाफ', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  administration: [
    { designation_id: 'default-adm-1', tier: 1, name: 'Administration / Establishment Head', name_hi: 'सामान्य प्रशासन / स्थापना प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-adm-2', tier: 2, name: 'Establishment / Personnel Officer', name_hi: 'स्थापना / कार्मिक अधिकारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-adm-3', tier: 3, name: 'Office / Staff Coordinator', name_hi: 'कार्यालय / स्टाफ समन्वयक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-adm-4', tier: 4, name: 'Clerks / Records / Support Staff', name_hi: 'लिपिक / रिकॉर्ड / सहायक कर्मचारी', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  it_control_room: [
    { designation_id: 'default-it-1', tier: 1, name: 'IT / Citizen Services Head', name_hi: 'सूचना प्रौद्योगिकी / नागरिक सेवा प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-it-2', tier: 2, name: 'System / Control Room In-charge', name_hi: 'सिस्टम / कंट्रोल रूम प्रभारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-it-3', tier: 3, name: 'Shift Supervisor', name_hi: 'शिफ्ट पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-it-4', tier: 4, name: 'Call Operators / Ticket / Data Staff', name_hi: 'कॉल ऑपरेटर / टिकट प्रबंधन स्टाफ', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  fleet: [
    { designation_id: 'default-fl-1', tier: 1, name: 'Fleet / Transport Department Head', name_hi: 'परिवहन एवं वर्कशॉप विभाग प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-fl-2', tier: 2, name: 'Fleet / Workshop In-charge', name_hi: 'फ्लीट / वर्कशॉप प्रभारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-fl-3', tier: 3, name: 'Route / Vehicle Supervisor', name_hi: 'रूट / वाहन पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-fl-4', tier: 4, name: 'Drivers / Mechanics / Vehicle Assistants', name_hi: 'चालक / मैकेनिक / वाहन सहायक', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
  fire: [
    { designation_id: 'default-fr-1', tier: 1, name: 'Fire Services Head', name_hi: 'अग्निशमन सेवा प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
    { designation_id: 'default-fr-2', tier: 2, name: 'Station / Shift In-charge', name_hi: 'स्टेशन / शिफ्ट प्रभारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
    { designation_id: 'default-fr-3', tier: 3, name: 'Crew Leader / Lead Firefighter', name_hi: 'दल नायक / लीड फायर फाइटर', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
    { designation_id: 'default-fr-4', tier: 4, name: 'Firefighters / Drivers / Crew', name_hi: 'अग्निशामक / चालक / रेस्क्यू क्रू', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
  ],
};

const GENERIC_DEFAULT_DESIGNATIONS: Designation[] = [
  { designation_id: 'default-generic-1', tier: 1, name: 'Department Head', name_hi: 'विभाग प्रमुख', hierarchy_code: 'department_head', maps_to_role: 'department_head' },
  { designation_id: 'default-generic-2', tier: 2, name: 'Area / Zone / Ward Officer', name_hi: 'क्षेत्रीय / जोनल / वार्ड अधिकारी', hierarchy_code: 'area_officer', maps_to_role: 'supervisor' },
  { designation_id: 'default-generic-3', tier: 3, name: 'Supervisor', name_hi: 'पर्यवेक्षक', hierarchy_code: 'supervisor', maps_to_role: 'supervisor' },
  { designation_id: 'default-generic-4', tier: 4, name: 'Operational Staff', name_hi: 'परिचालन कर्मचारी', hierarchy_code: 'operational_staff', maps_to_role: 'field_employee' },
];

  /* ---------- loads (use the admin's own client) ---------- */
  useEffect(() => {
    supabase.from('cities').select('id, name, state, slug').eq('is_active', true).order('name')
      .then(({ data, error: e }) => {
        if (e) { setError('Could not load cities: ' + e.message); return; }
        setCities((data ?? []) as City[]);
      });
    supabase.from('departments').select('id, name, slug, icon').eq('is_active', true).order('name')
      .then(({ data }) => setDepartments((data ?? []) as Department[]));
  }, []);

  useEffect(() => {
    if (!selectedDept) { setDesignations([]); setSelectedDesig(null); return; }

    const deptObj = departments.find(d => d.id === selectedDept);
    const deptSlug = deptObj?.slug || '';
    const fallbackList = DEPARTMENT_DESIGNATIONS_MAP[deptSlug] || GENERIC_DEFAULT_DESIGNATIONS;

    supabase.rpc('list_chain_for_dept', { p_dept_id: selectedDept })
      .then(({ data, error: e }) => {
        if (!e && data && (data as Designation[]).length > 0) {
          setDesignations(data as Designation[]);
        } else {
          setDesignations(fallbackList);
        }
        setSelectedDesig(null);
      });
  }, [selectedDept, departments]);

  /* ---------- derived ---------- */
  const isDeptRole = roleKey.startsWith('dept:');
  const needsOfficer = !['municipal_commissioner', 'control_room', 'verification_officer'].includes(roleKey);
  const needsDeputy = isDeptRole && !!selectedDesig &&
    (selectedDesig.hierarchy_code === 'department_head' || selectedDesig.tier === 1);

  const flow: Stage[] = ['account', 'city', 'role'];
  if (isDeptRole) flow.push('level');
  if (needsOfficer) flow.push('officer');
  flow.push('details');
  const stepIdx = flow.indexOf(stage);

  const manualCities = MANUAL_CITIES.map(m => ({
    ...m,
    dbCity: cities.find(c =>
      (c.name || '').trim().toLowerCase() === m.key ||
      (c.slug || '').trim().toLowerCase() === m.key) || null,
  }));
  const otherCities = cities.filter(c =>
    !MANUAL_CITIES.some(m => m.key === (c.name || '').trim().toLowerCase()));

  /* ---------- handlers ---------- */
  const goBack = () => {
    setError('');
    const i = flow.indexOf(stage);
    if (i > 0) setStage(flow[i - 1]);
  };

  const next = (from: Stage) => {
    setError('');
    const i = flow.indexOf(from);
    setStage(flow[i + 1]);
  };

  const validateAccount = () => {
    if (!fullName.trim()) { setError('Enter staff member full name'); return; }
    if (!phone.trim()) { setError('Enter staff member mobile number'); return; }
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) { setError('Enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setEmail(mail);
    next('account');
  };

  const validateRole = () => {
    if (!roleKey) { setError('Please select a role'); return; }
    // flow changes with roleKey, so compute the target manually
    setError('');
    if (roleKey.startsWith('dept:')) setStage('level');
    else if (needsOfficer) setStage('officer');
    else setStage('details');
  };

  const validateLevel = () => {
    if (!selectedDesig) {
      if (designations.length > 0) setSelectedDesig(designations[0]);
    }
    setError('');
    setStage(needsOfficer ? 'officer' : 'details');
  };

  const runSearch = async () => {
    if (!searchTerm.trim() && !needsDeputy) { setError('Enter a search term'); return; }
    setSearching(true); setError('');
    try {
      let list: StaffMatch[] = [];
      const term = searchTerm.trim();

      try {
        const { data, error: e } = await supabase.rpc('search_approvers_for_signup', {
          p_search: term,
          p_city_id: selectedCity || null,
          p_department_id: isDeptRole ? (selectedDept || null) : null,
          p_lat: null,
          p_lng: null,
          p_limit: 25,
        });
        if (!e && data && (data as any[]).length > 0) {
          list = data as StaffMatch[];
        }
      } catch (rpcErr) {
        console.warn('RPC search_approvers_for_signup failed, falling back:', rpcErr);
      }

      // If RPC gave no matches, fallback to direct query on user_profiles
      if (list.length === 0) {
        let query = supabase
          .from('user_profiles')
          .select('id, full_name, role, hierarchy_code, staff_code, linked_department_id')
          .neq('role', 'citizen');

        if (term) {
          query = query.or(`full_name.ilike.%${term}%,staff_code.ilike.%${term}%,email.ilike.%${term}%,hierarchy_code.ilike.%${term}%`);
        }
        if (selectedCity) {
          query = query.or(`city_id.eq.${selectedCity},city_id.is.null`);
        }

        const { data: profs, error: pErr } = await query.limit(25);
        if (!pErr && profs) {
          list = profs.map(p => ({
            id: p.id,
            full_name: p.full_name,
            role: p.role,
            hierarchy_code: p.hierarchy_code,
            staff_code: p.staff_code,
            department_name: departments.find(d => d.id === p.linked_department_id)?.name || null,
            designation_name: (p.role || '').replace(/_/g, ' '),
          }));
        }
      }

      if (needsDeputy) list = list.filter(m => m.hierarchy_code === 'deputy_commissioner' || m.role === 'department_head');
      setSearchResults(list);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally { setSearching(false); }
  };

  const validateOfficer = () => {
    setError('');
    setStage('details');
  };

  const handleSubmit = async () => {
    setError('');
    if (!fullName.trim()) { setError('Please enter the full name'); return; }

    setLoading(true);
    try {
      let targetRole = 'dept_staff';
      if (isDeptRole) {
        targetRole = (selectedDesig && selectedDesig.maps_to_role) || 'dept_staff';
      } else if (roleKey === 'municipal_commissioner') {
        targetRole = 'municipal_administrator';
      } else if (roleKey === 'deputy_commissioner') {
        targetRole = 'department_head';
      } else {
        targetRole = roleKey || 'dept_staff';
      }

      const validDesigId = selectedDesig && !selectedDesig.designation_id.startsWith('default-')
        ? selectedDesig.designation_id
        : null;

      // 1. Create the auth user on the separate client (admin session untouched)
      const { data, error: signErr } = await provisionClient.auth.signUp({ email, password });

      let userId = data?.user?.id;

      if (signErr) {
        if (/already registered|already exists/i.test(signErr.message)) {
          // Upgrade existing profile
          const { data: existingProfiles } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', email)
            .limit(1);

          if (existingProfiles && existingProfiles.length > 0) {
            userId = existingProfiles[0].id;
          } else {
            throw new Error('This email is already registered in Auth, but existing profile could not be retrieved.');
          }
        } else {
          throw signErr;
        }
      }

      if (!userId) {
        throw new Error('Could not retrieve user ID for registration.');
      }

      // 2. Generate unique Staff Code and Hierarchy Code
      const deptObj = departments.find(d => d.id === selectedDept);
      const cityObj = cities.find(c => c.id === selectedCity);
      const cityPrefix = (cityObj?.slug || cityObj?.name || 'BET').slice(0, 3).toUpperCase();
      const deptPrefix = deptObj ? (deptObj.slug || deptObj.name).slice(0, 3).toUpperCase() : 'ADM';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedStaffCode = `${cityPrefix}-${deptPrefix}-${randomNum}`;

      const hierarchyCode = isDeptRole
        ? (selectedDesig?.hierarchy_code || (selectedDesig?.tier === 1 ? 'department_head' : selectedDesig?.tier === 2 ? 'supervisor' : 'operational_staff'))
        : (roleKey === 'municipal_commissioner' ? 'commissioner' : roleKey === 'deputy_commissioner' ? 'deputy_commissioner' : roleKey);

      const authorityRole = !isDeptRole ? roleKey : null;

      // Upsert profile in user_profiles using admin's client
      const profilePayload: Record<string, any> = {
        id: userId,
        email: email,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: targetRole,
        linked_department_id: isDeptRole ? (selectedDept || null) : null,
        city_id: selectedCity || null,
        supervisor_id: supervisor ? supervisor.id : null,
        designation_id: validDesigId,
        staff_code: generatedStaffCode,
        hierarchy_code: hierarchyCode,
        authority_role: authorityRole,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        language: 'en',
      };

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .upsert(profilePayload);

      if (profileErr) {
        console.warn('Profile upsert direct error:', profileErr);
        const { error: updateErr } = await supabase
          .from('user_profiles')
          .update(profilePayload)
          .eq('id', userId);
        if (updateErr) {
          throw new Error('Profile update failed: ' + (profileErr.message || updateErr.message));
        }
      }

      // 3. Optional RPC if session is present on provisionClient
      if (data?.session) {
        try {
          if (isDeptRole) {
            await provisionClient.rpc('register_as_staff', {
              target_role: targetRole,
              department_id: selectedDept,
              city_id: selectedCity,
              supervisor_id: supervisor ? supervisor.id : null,
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              designation_id: validDesigId,
              zone_id: null,
            });
          } else {
            await provisionClient.rpc('register_authority_user', {
              p_authority_role: roleKey,
              p_city_id: selectedCity,
              p_supervisor_id: supervisor ? supervisor.id : null,
              p_full_name: fullName.trim(),
              p_phone: phone.trim() || null,
              p_designation_id: validDesigId,
              p_zone_id: null,
            });
          }
        } catch {
          // ignore RPC errors if profile is already updated
        }
      }

      await provisionClient.auth.signOut();

      setCreated({ email, password, staffCode: generatedStaffCode });
      setStage('done');
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStage('account'); setEmail(''); setPassword(''); setSelectedCity('');
    setRoleKey(''); setSelectedDept(''); setSelectedDesig(null); setSupervisor(null);
    setSearchResults([]); setSearchTerm(''); setSearched(false);
    setFullName(''); setPhone(''); setError(''); setCreated(null); setCopied(false);
  };

  const copyCreds = async () => {
    if (!created) return;
    try {
      const parts = [];
      if (created.staffCode) parts.push(`Staff ID / Dept ID: ${created.staffCode}`);
      parts.push(`Email: ${created.email}`);
      parts.push(`Password: ${created.password}`);
      await navigator.clipboard.writeText(parts.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const NavRow = ({ onNext, label = 'Continue' }: { onNext: () => void; label?: string }) => (
    <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
      <button type="button" onClick={goBack} style={S.btnSecondary}><ChevronLeft size={15} /></button>
      <button type="button" onClick={onNext} style={{ ...S.btnPrimary, flex: 1 }}>
        {label} <ArrowRight size={15} />
      </button>
    </div>
  );

  /* ---------- render ---------- */
  return (
    <div style={{ maxWidth: 520, background: 'var(--theme-component, #d9d9d9)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--theme-component-border, #bfbfbf)', overflow: 'hidden' }}>
      {stage !== 'done' && (
        <div style={{ display: 'flex', gap: 3, padding: '0 24px', marginTop: 16 }}>
          {flow.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? 'var(--theme-primary, #660033)' : 'var(--theme-component-border, #bfbfbf)' }} />
          ))}
        </div>
      )}

      <div style={{ padding: '20px 24px 24px' }}>
        <AlertBanner type="error" message={error} />

        {/* ACCOUNT */}
        {stage === 'account' && (
          <>
            <h2 style={S.h2}>Staff details & credentials</h2>
            <p style={S.sub}>Enter the staff member's name, mobile number, and login credentials.</p>
            <FormInput icon={User} placeholder="Staff Full Name *"
              value={fullName} onChange={e => setFullName(e.target.value)} />
            <FormInput icon={Phone} type="tel" placeholder="Mobile Number (10 digits) *"
              value={phone} onChange={e => setPhone(e.target.value)} />
            <FormInput icon={Mail} type="email" placeholder="Staff Email Address *"
              value={email} onChange={e => setEmail(e.target.value)} />
            <PasswordInput placeholder="Password * (min 6 characters)"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setPassword(genPassword())}
              style={{ ...S.btnSecondary, marginTop: 8, width: '100%' }}>
              <Wand2 size={14} /> Generate strong password
            </button>
            <button type="button" onClick={validateAccount} style={{ ...S.btnPrimary, marginTop: 16 }}>
              Continue <ArrowRight size={15} />
            </button>
          </>
        )}

        {/* CITY */}
        {stage === 'city' && (
          <>
            <h2 style={S.h2}>Select city</h2>
            <p style={S.sub}>Which city will this staff member work in?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {manualCities.map(m => {
                const id = m.dbCity ? m.dbCity.id : '';
                const active = !!id && selectedCity === id;
                return (
                  <button key={m.key} type="button" disabled={!m.dbCity}
                    onClick={() => { if (id) { setSelectedCity(id); setError(''); } }}
                    style={{
                      padding: '16px 12px', textAlign: 'left',
                      border: active ? '2px solid #16a34a' : '1.5px solid var(--gray-200)',
                      borderRadius: 'var(--radius-md)', background: active ? '#f0fdf4' : '#fff',
                      cursor: m.dbCity ? 'pointer' : 'not-allowed', opacity: m.dbCity ? 1 : 0.5,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color={active ? '#16a34a' : '#9ca3af'} />
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: active ? '#15803d' : 'var(--gray-800)' }}>{m.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {otherCities.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Other cities</label>
                <div style={{ position: 'relative' }}>
                  <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} style={S.select}>
                    <option value="">— Select —</option>
                    {otherCities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                </div>
              </div>
            )}
            <NavRow onNext={() => {
              if (!selectedCity) { setError('Please select a city'); return; }
              setError(''); setStage('role');
            }} />
          </>
        )}

        {/* ROLE */}
        {stage === 'role' && (
          <>
            <h2 style={S.h2}>Select role</h2>
            <p style={S.sub}>Pick an officer role or a department</p>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Crown size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <select value={roleKey}
                onChange={e => {
                  const v = e.target.value;
                  setRoleKey(v); setSelectedDesig(null); setSupervisor(null);
                  setSearchResults([]); setSearched(false);
                  setSelectedDept(v.startsWith('dept:') ? v.slice(5) : '');
                }}
                style={S.select}>
                <option value="">— Select Role —</option>
                <optgroup label="Authority">
                  <option value="municipal_commissioner">Municipal Commissioner</option>
                  <option value="deputy_commissioner">Deputy Commissioner</option>
                  <option value="control_room">Control Room</option>
                  <option value="verification_officer">Verifier / Appeals Officer</option>
                </optgroup>
                <optgroup label="Departments">
                  {departments.map(d => <option key={d.id} value={`dept:${d.id}`}>{d.icon} {d.name}</option>)}
                </optgroup>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
            </div>
            <NavRow onNext={validateRole} />
          </>
        )}

        {/* LEVEL */}
        {stage === 'level' && (
          <>
            <h2 style={S.h2}>Select level</h2>
            <p style={S.sub}>{departments.find(d => d.id === selectedDept)?.name || ''} — department chain</p>
            {designations.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>No levels available for this department.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {designations.map(d => {
                  const active = selectedDesig?.designation_id === d.designation_id;
                  return (
                    <button key={d.designation_id} type="button"
                      onClick={() => { setSelectedDesig(d); setSupervisor(null); setSearchResults([]); setSearched(false); }}
                      style={{
                        padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
                        border: active ? '2px solid var(--theme-primary, #660033)' : '1.5px solid var(--theme-component-border, #bfbfbf)',
                        borderRadius: 'var(--radius-md)', background: active ? 'var(--theme-component, #d9d9d9)' : 'var(--theme-bg, #fff4e7)',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                      <Briefcase size={16} color={active ? 'var(--theme-primary, #660033)' : '#9ca3af'} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: '0.85rem', color: active ? 'var(--theme-primary, #660033)' : 'var(--gray-800)' }}>{d.name}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--gray-500)' }}>
                          {d.hierarchy_code ? d.hierarchy_code.replace(/_/g, ' ') : `Tier ${d.tier}`}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <NavRow onNext={validateLevel} />
          </>
        )}

        {/* OFFICER */}
        {stage === 'officer' && (
          <>
            <h2 style={S.h2}>{needsDeputy ? 'Deputy Commissioner' : 'Reporting officer'}</h2>
            <p style={S.sub}>
              {needsDeputy
                ? 'Search by staff code or name (leave empty to list all)'
                : 'Search the senior officer by staff code or name'}
            </p>

            {supervisor ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--theme-component-border, #bfbfbf)', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BadgeCheck size={20} color="var(--theme-primary, #660033)" />
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: '0.88rem', color: 'var(--theme-primary, #660033)' }}>{supervisor.full_name}</p>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--theme-primary, #660033)' }}>
                      {(supervisor.designation_name || supervisor.hierarchy_code || '').replace(/_/g, ' ')}
                      {supervisor.staff_code ? ` • ${supervisor.staff_code}` : ''}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => { setSupervisor(null); setSearched(false); }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--theme-primary, #660033)', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setSupervisor(null); validateOfficer(); }}
                    style={{ background: 'none', border: 'none', color: 'var(--theme-primary, #660033)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Skip (No reporting officer / Top Level) →
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
                    <input type="text" placeholder="Staff code, name or ID" value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setSearched(false); }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                      style={S.input} />
                  </div>
                  <button type="button" onClick={runSearch} disabled={searching}
                    style={{ padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--primary-gradient, linear-gradient(135deg,#660033,#800040))', color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: searching ? 'wait' : 'pointer' }}>
                    {searching ? '…' : 'Find'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div style={{ border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', maxHeight: 260, overflowY: 'auto' }}>
                    {searchResults.map(m => (
                      <button key={m.id} type="button" style={S.row}
                        onClick={() => { setSupervisor(m); setSearchResults([]); setSearchTerm(''); }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>{m.full_name || 'Unnamed Staff'}</p>
                          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                            {(m.designation_name || m.hierarchy_code || m.role || '').replace(/_/g, ' ')}
                            {m.staff_code ? ` • ${m.staff_code}` : ''}
                            {m.department_name ? ` • ${m.department_name}` : ''}
                          </p>
                        </div>
                        <ArrowRight size={14} color="var(--gray-400)" />
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.length === 0 && !searching && searched && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--gray-500)' }}>No matches found. You can skip this step.</p>
                )}
              </>
            )}
            <NavRow onNext={validateOfficer} />
          </>
        )}

        {/* DETAILS */}
        {stage === 'details' && (
          <>
            <h2 style={S.h2}>Staff details</h2>
            <p style={S.sub}>Review and create the account</p>

            <div style={{ padding: '12px 14px', background: 'var(--theme-bg, #fff4e7)', borderRadius: 'var(--radius-md)', border: '1px solid var(--theme-component-border, #bfbfbf)', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: 'var(--gray-700)' }}>
              <span><b>Email:</b> {email}</span>
              <span><b>City:</b> {cities.find(c => c.id === selectedCity)?.name}</span>
              {isDeptRole && <span><b>Dept:</b> {departments.find(d => d.id === selectedDept)?.name}</span>}
              {isDeptRole && selectedDesig && <span><b>Level:</b> {selectedDesig.name}</span>}
              {!isDeptRole && <span><b>Role:</b> {roleKey.replace(/_/g, ' ')}</span>}
              {supervisor && <span><b>Reports to:</b> {supervisor.full_name}{supervisor.staff_code ? ` (${supervisor.staff_code})` : ''}</span>}
            </div>

            <FormInput icon={User} placeholder="Full Name *" value={fullName} onChange={e => setFullName(e.target.value)} />
            <FormInput icon={Phone} placeholder="Mobile Number" value={phone} onChange={e => setPhone(e.target.value)} />

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button type="button" onClick={goBack} style={S.btnSecondary}><ChevronLeft size={15} /></button>
              <button type="button" onClick={handleSubmit} disabled={loading}
                style={{ ...S.btnPrimary, flex: 1, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? 'Creating…' : <><ShieldCheck size={16} /> Create staff account</>}
              </button>
            </div>
          </>
        )}

        {/* DONE */}
        {stage === 'done' && created && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--theme-component, #d9d9d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <BadgeCheck size={28} color="var(--theme-primary, #660033)" />
              </div>
              <h2 style={S.h2}>Staff account created</h2>
              <p style={{ ...S.sub, margin: 0 }}>Share these credentials with the staff member. The password is not shown again.</p>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--theme-bg, #fff4e7)', border: '1.5px solid var(--theme-component-border, #bfbfbf)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', lineHeight: 1.9 }}>
              {created.staffCode && (
                <div>
                  <b>Staff ID / Dept ID:</b>{' '}
                  <code style={{ fontWeight: 800, color: 'var(--theme-primary, #660033)' }}>{created.staffCode}</code>
                </div>
              )}
              <div><b>Email:</b> {created.email}</div>
              <div><b>Password:</b> <code>{created.password}</code></div>
            </div>

            <p style={{ margin: '12px 0 0', fontSize: '0.78rem', color: 'var(--theme-primary, #660033)', fontWeight: 700 }}>
              ✅ The account has been created and automatically approved. The staff member can now log in immediately.
            </p>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={copyCreds} style={{ ...S.btnSecondary, flex: 1 }}>
                <Copy size={14} /> {copied ? 'Copied!' : 'Copy credentials'}
              </button>
              <button type="button" onClick={reset} style={{ ...S.btnPrimary, flex: 1 }}>
                <Plus size={15} /> Register another
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
