'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TelegramMiniApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get Telegram User Data from Telegram WebApp SDK
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand(); // Opens app in full-screen on mobile
      
      const tgUser = tg.initDataUnsafe?.user;
      if (tgUser) {
        fetchUserProfile(tgUser.id.toString());
      } else {
        setLoading(false);
      }
    }
  }, []);

  async function fetchUserProfile(telegramId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*, student_profiles(*)')
      .eq('telegram_chat_id', telegramId)
      .single();

    if (data) setUser(data);
    setLoading(false);
  }

  if (loading) return <div className="p-4 text-center">Loading driving portal...</div>;
  if (!user) return <div className="p-4 text-center">Please link your account with the school admin.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold">Welcome, {user.full_name}</h1>
      <p className="text-sm text-gray-600">Role: {user.role}</p>

      {/* Render component based on user role */}
      {user.role === 'teacher' ? (
        <TeacherDashboard teacherId={user.id} />
      ) : (
        <StudentScheduleView studentId={user.student_profiles[0]?.id} />
      )}
    </div>
  );
}

function TeacherDashboard({ teacherId }: { teacherId: string }) {
  return <div className="mt-4">Teacher View: Attendance Toggles & Class Calendar</div>;
}

function StudentScheduleView({ studentId }: { studentId: string }) {
  return <div className="mt-4">Student View: Projected Calendar & Teacher Contact Info</div>;
}
