'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (isSignUp) {
      // 1. Register Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setErrorMsg(authError.message);
        setLoading(false);
        return;
      }

      // 2. Create School Profile
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .insert({ name: schoolName, phone_number: phone })
        .select()
        .single();

      if (schoolError) {
        setErrorMsg(schoolError.message);
        setLoading(false);
        return;
      }

      // 3. Create User Profile linked to School
      if (authData.user) {
        await supabase.from('users').insert({
          id: authData.user.id,
          school_id: school.id,
          full_name: schoolName + ' Admin',
          phone_number: phone,
          role: 'school_admin',
        });
      }

      router.push('/admin/dashboard');
    } else {
      // Sign In
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }
      router.push('/admin/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isSignUp ? 'Register Your Driving School' : 'Administrator Login'}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {isSignUp
            ? 'Set up your school account to manage teachers and practical logs.'
            : 'Access your administrative control panel.'}
        </p>

        {errorMsg && <p className="text-xs text-red-500 bg-red-50 p-2 rounded mb-4">{errorMsg}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">School Name</label>
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                  placeholder="e.g. City Driving School"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-lg text-sm"
                  placeholder="+251..."
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg text-sm"
              placeholder="admin@drivingschool.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 p-2 border rounded-lg text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create School Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 font-bold hover:underline ml-1"
          >
            {isSignUp ? 'Log In' : 'Register School'}
          </button>
        </div>
      </div>
    </div>
  );
}
