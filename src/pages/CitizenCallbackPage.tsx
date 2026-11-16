import React, { useState } from 'react';
import { PhoneCall, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { isValidMobile, lettersAndSpaces, mobileDigits } from '../lib/inputValidation';
import { CivicHeader } from '../components/common/CivicHeader';
import { BottomNav } from '../components/BottomNav';

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
    <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-28 lg:pb-12">
      <CivicHeader
        title={hi ? 'कॉल बैक अनुरोध' : 'Request Callback'}
        subtitle={hi ? 'कंट्रोल रूम सहायता • नगर पालिका परिषद' : 'Control Room Assistance • Municipal Council'}
        showBack
      />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        <section className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-card space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-civic-50 border border-civic-100 text-civic-700 flex items-center justify-center shrink-0">
              <PhoneCall size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-civic-950 tracking-tight">
                {hi ? 'नागरिक सहायता व अपील' : 'Citizen Assistance & Appeal'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {hi
                  ? 'नगर पालिका कंट्रोल रूम अधिकारी आपसे संपर्क करेंगे।'
                  : 'Municipal control room officers will connect with you.'}
              </p>
            </div>
          </div>

          {submitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
              <CheckCircle2 size={36} className="text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">
                {hi ? 'अनुरोध सफलतापूर्वक भेजा गया!' : 'Request Sent Successfully!'}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
                {hi
                  ? 'आपका अनुरोध नगर पालिका कंट्रोल रूम को प्राप्त हो गया है। जल्द ही आपसे संपर्क किया जाएगा।'
                  : 'Your request has been delivered to the municipal control room. An officer will call you soon.'}
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {hi ? 'पूरा नाम *' : 'Full Name *'}
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(lettersAndSpaces(e.target.value))}
                  placeholder={hi ? 'उदा. राहुल वर्मा' : 'e.g. Rahul Verma'}
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {hi ? 'मोबाइल नंबर *' : 'Mobile Number *'}
                </label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(mobileDigits(e.target.value))}
                  placeholder="10-digit mobile number"
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {hi ? 'अनुरोध का प्रकार *' : 'Request Type *'}
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as 'callback' | 'appeal')}
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                >
                  <option value="callback">{hi ? 'कॉल बैक / सामान्य सहायता' : 'Callback / General Assistance'}</option>
                  <option value="appeal">{hi ? 'शिकायत समाधान पर अपील' : 'Appeal a Complaint Decision'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {hi ? 'शिकायत टिकट नंबर' : 'Complaint Ticket ID'}{' '}
                  <span className="text-slate-400 font-normal lowercase">({hi ? 'वैकल्पिक' : 'optional'})</span>
                </label>
                <input
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="e.g. BTL-2026-00020"
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {hi ? 'किस बारे में सहायता चाहिए? *' : 'How can we help? *'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    hi
                      ? 'कृपया अपनी समस्या या अपील का संक्षेप में विवरण दें...'
                      : 'Briefly explain your concern or the reason for your appeal…'
                  }
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  {hi ? 'कॉल का पसंदीदा समय' : 'Preferred Callback Time'}{' '}
                  <span className="text-slate-400 font-normal lowercase">({hi ? 'वैकल्पिक' : 'optional'})</span>
                </label>
                <input
                  type="datetime-local"
                  value={preferredAt}
                  onChange={(e) => setPreferredAt(e.target.value)}
                  className="w-full bg-sand-50 border border-sand-200 rounded-2xl p-3.5 text-sm text-slate-800 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 transition"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer shadow-sm ${
                  saving
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-civic-700 hover:bg-civic-800 text-white'
                }`}
              >
                <Send size={16} />
                <span>{saving ? (hi ? 'भेज रहे हैं…' : 'Sending…') : (hi ? 'अनुरोध भेजें' : 'Send Request')}</span>
              </button>
            </form>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
