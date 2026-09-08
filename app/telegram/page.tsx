'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TelegramMiniApp() {
  const [telegramUser, setTelegramUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Phone linking state
  const [inputPhone, setInputPhone] = useState('');
  const [linkingError, setLinkingError] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    // 1. Get Telegram User Data from Telegram WebApp SDK
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const user = tg.initDataUnsafe?.user;
      setTelegramUser(user);

      if (user?.id) {
        checkUserByTelegramId(user.id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // 2. Check if this Telegram ID already exists in Supabase
  async function checkUserByTelegramId(tgId: number) {
    const { data } = await supabase
      .from('users')
      .select('*, student_profiles(*)')
      .eq('telegram_id', tgId)
      .maybeSingle();

    if (data) {
      setDbUser(data);
    }
    setLoading(false);
  }

  // 3. Link account by Phone Number with format normalization & detailed errors
  async function handleLinkAccount(e: React.FormEvent) {
    e.preventDefault();
    setLinkingError('');
    setIsLinking(true);

    if (!telegramUser?.id) {
      setLinkingError('Telegram account information not detected. Please open inside Telegram.');
      setIsLinking(false);
      return;
    }

    const cleanInput = inputPhone.trim();

    // Prepare formats: local (09...) and international (+251...)
    const formattedLocal = cleanInput.startsWith('+251')
      ? '0' + cleanInput.slice(4)
      : cleanInput;
    const formattedIntl = cleanInput.startsWith('0')
      ? '+251' + cleanInput.slice(1)
      : cleanInput;

    // Search and update matching row
    const { data, error } = await supabase
      .from('users')
      .update({ telegram_id: telegramUser.id })
      .or(`phone_number.eq.${cleanInput},phone_number.eq.${formattedLocal},phone_number.eq.${formattedIntl}`)
      .select('*, student_profiles(*)')
      .maybeSingle();

    if (error) {
      setLinkingError(`Database error: ${error.message}`);
      setIsLinking(false);
      return;
    }

    if (!data) {
      setLinkingError(
        'Phone number not found in school database. Verify the exact phone number registered on the admin dashboard.'
      );
      setIsLinking(false);
    } else {
      setDbUser(data);
      setIsLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <p className="text-sm">Loading profile...</p>
      </div>
    );
  }

  // SCREEN A: Unlinked Account (Show Phone Linking Screen)
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center p-6">
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl space-y-4">
          <div className="text-center">
            <h1 className="text-xl font-bold text-blue-400">Link Your Account</h1>
            <p className="text-xs text-slate-400 mt-1">
              Enter the phone number registered with your driving school administration.
            </p>
          </div>

          {linkingError && (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-xs text-red-400">
              {linkingError}
            </div>
          )}

          <form onSubmit={handleLinkAccount} className="space-y-4">
            <div>
              <label className="text-xs uppercase font-bold text-slate-400">Phone Number</label>
              <input
                type="text"
                required
                placeholder="e.g. 0912121212 or +251..."
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
                className="w-full mt-1 p-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLinking}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl text-sm transition-all"
            >
              {isLinking ? 'Verifying...' : 'Link Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // SCREEN B: Linked Account (Show Teacher or Student Experience)
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Welcome, {dbUser.full_name}</h1>
        <p className="text-xs text-blue-400 uppercase font-semibold mt-1">Role: {dbUser.role}</p>
      </header>

      {dbUser.role === 'teacher' ? (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
          <h2 className="text-md font-bold mb-2">Teacher Attendance Scanner</h2>
          <p className="text-xs text-slate-400 mb-4">Point your camera at the student's QR code.</p>
          <QrScanner
             onScanSuccess={async (studentId) => {
        // Insert attendance record into Supabase
             const { error } = await supabase.from('attendance_logs').insert({
                teacher_id: dbUser.id,
                student_id: studentId,
                timestamp: new Date().toISOString(),
             });

             if (!error) alert('Attendance marked successfully!');
           }}
         />
       </div>
      ) : (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
          <h2 className="text-md font-bold mb-2">Student Digital Pass</h2>
          <p className="text-xs text-slate-400 mb-4">Show this QR code to your teacher at each practical session.</p>
        </div>
      )}
    </div>
  );
}
