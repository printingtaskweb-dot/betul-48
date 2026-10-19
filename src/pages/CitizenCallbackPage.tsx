import React, { useState } from 'react';
import { ArrowLeft, PhoneCall, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
  borderRadius: 6, border: '1px solid var(--theme-component-border, #bfbfbf)',
  background: 'var(--theme-bg, #F6F1F1)', font: 'inherit',
};

export default function CitizenCallbackPage() {
  const { user, language } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState('');
  const [requestType, setRequestType] = useState<'callback' | 'appeal'>('callback');
  const [message, setMessage] = useState('');
  const [preferredAt, setPreferredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const hi = language === 'hi';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValidMobile(phone)) {
      setError(hi ? 'कृपया 10 अंकों का सही मोबाइल नंबर दर्ज करें।' : 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (requestType === 'appeal' && !ticket.trim()) {
      setError(hi ? 'अपील के लिए शिकायत टिकट नंबर आवश्यक है।' : 'A complaint ticket is required for an appeal.');
      return;
    }
    setSaving(true);
    setError('');

    let complaintId: string | null = null;
    if (ticket.trim()) {
      const { data, error: ticketError } = await supabase.from('complaints')
        .select('id').eq('ticket_number', ticket.trim()).maybeSingle();
      if (ticketError || !data) {
        setSaving(false);
        setError(hi ? 'टिकट नंबर नहीं मिला। कृपया सही नंबर दें।' : 'Ticket number not found. Check it and try again.');
        return;
      }
      complaintId = data.id;
    }

    const { error: insertError } = await supabase.from('citizen_callback_requests').insert({
      request_type: requestType,
      citizen_name: lettersAndSpaces(name).trim(),
      citizen_phone: mobileDigits(phone),
      complaint_id: complaintId,
      message: message.trim(),
      preferred_callback_at: preferredAt ? new Date(preferredAt).toISOString() : null,
      created_by: user?.id || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <main style={{ minHeight: '100vh', padding: '24px 16px', background: 'var(--theme-bg, #F6F1F1)' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'grid', gap: 16 }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--theme-primary, #146C94)', textDecoration: 'none', fontWeight: 700 }}><ArrowLeft size={16} />{hi ? 'होम' : 'Home'}</Link>
        <section style={{ background: 'var(--theme-component, #d9d9d9)', border: '1px solid var(--theme-component-border, #bfbfbf)', borderRadius: 8, padding: 22 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><PhoneCall size={22} color="var(--theme-primary, #146C94)" /><h1 style={{ margin: 0, fontSize: '1.25rem' }}>{hi ? 'कॉल बैक अनुरोध' : 'Request a callback'}</h1></div>
          {submitted ? (
            <div role="status" style={{ marginTop: 18, color: '#166534', fontWeight: 700 }}>{hi ? 'आपका अनुरोध कंट्रोल रूम को भेज दिया गया है।' : 'Your request has been sent to the municipal control room.'}</div>
          ) : (
            <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              {error && <div role="alert" style={{ color: '#991b1b' }}>{error}</div>}
              <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700 }}>{hi ? 'नाम' : 'Name'}<input required value={name} onChange={(e) => setName(lettersAndSpaces(e.target.value))} style={input} /></label>
              <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700 }}>{hi ? 'फोन नंबर' : 'Phone number'}<input required type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={(e) => setPhone(mobileDigits(e.target.value))} style={input} /></label>
              <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700 }}>{hi ? 'अनुरोध का प्रकार' : 'Request type'}<select value={requestType} onChange={(e) => setRequestType(e.target.value as 'callback' | 'appeal')} style={input}><option value="callback">{hi ? 'कॉल बैक / सहायता' : 'Callback / assistance'}</option><option value="appeal">{hi ? 'शिकायत पर अपील' : 'Appeal a complaint decision'}</option></select></label>
              <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700 }}>{hi ? 'टिकट नंबर (वैकल्पिक)' : 'Complaint ticket (optional)'}<input value={ticket} onChange={(e) => setTicket(e.target.value)} style={input} /></label>
              <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700 }}>{hi ? 'किस बारे में सहायता चाहिए?' : 'How can we help?'}<textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} style={input} /></label>
              <label style={{ display: 'grid', gap: 5, fontSize: '0.8rem', fontWeight: 700 }}>{hi ? 'कॉल का पसंदीदा समय (वैकल्पिक)' : 'Preferred callback time (optional)'}<input type="datetime-local" value={preferredAt} onChange={(e) => setPreferredAt(e.target.value)} style={input} /></label>
              <button type="submit" disabled={saving} style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 14px', border: 0, borderRadius: 6, background: 'var(--theme-primary, #146C94)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}><Send size={14} />{saving ? (hi ? 'भेज रहे हैं…' : 'Sending…') : (hi ? 'अनुरोध भेजें' : 'Send request')}</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}