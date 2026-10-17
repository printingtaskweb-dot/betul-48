import React, { useState } from 'react';
import { Mail, User, Phone, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { FormInput } from './FormInput';
import { PasswordInput } from './PasswordInput';
import { AlertBanner } from './AlertBanner';
import { isValidMobile, lettersAndSpaces, mobileDigits, wholeNumber } from '../../lib/inputValidation';

interface Props {
  language: 'en' | 'hi';
  selectedLang: 'en' | 'hi';
}

export const RegisterForm: React.FC<Props> = ({ language, selectedLang }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isValidMobile(phone)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        full_name: fullName,
        phone,
        ward_number: ward,
        language: selectedLang,
      });
    }
    setSuccess('Account created! Check your email to verify.');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <AlertBanner type="error" message={error} />
      <AlertBanner type="success" message={success} />

      <FormInput
        required
        icon={User}
        placeholder={t(language, 'fullName')}
        value={fullName}
        onChange={(e) => setFullName(lettersAndSpaces(e.target.value))}
      />
      <FormInput
        icon={Phone}
        type="tel"
        inputMode="numeric"
        maxLength={10}
        placeholder={t(language, 'phone')}
        value={phone}
        onChange={(e) => setPhone(mobileDigits(e.target.value))}
      />
      <FormInput
        icon={MapPin}
        inputMode="numeric"
        placeholder={`${t(language, 'ward')} (${t(language, 'optional')})`}
        value={ward}
        onChange={(e) => setWard(wholeNumber(e.target.value, 3))}
      />
      <FormInput
        required
        type="email"
        icon={Mail}
        placeholder={t(language, 'email')}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <PasswordInput
        required
        placeholder={t(language, 'password')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <PasswordInput
        required
        placeholder={t(language, 'confirmPassword')}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 10,
          border: 'none',
          background: loading
            ? 'var(--gray-300)'
            : 'var(--primary-gradient, linear-gradient(135deg, #660033, #800040))',
          color: '#fff',
          fontWeight: 700,
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: 8,
          boxShadow: '0 4px 16px rgba(102,0,51,0.3)',
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? '...' : t(language, 'createAccount')}
      </button>
    </form>
  );
};
