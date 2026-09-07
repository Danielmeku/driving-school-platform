'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminDashboard() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Student Onboarding State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseType, setLicenseType] = useState('Category_B');
  const [teacherId, setTeacherId] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  // New Teacher Registration State
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  async function fetchTeachers() {
    const { data } = await supabase.from('users').select('*').eq('role', 'teacher');
    if (data) setTeachers(data);
  }

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select(`
      *,
      student_profiles (
        photo_url,
        license_type,
        users ( full_name, phone_number )
      ),
      teacher:users!courses_teacher_id_fkey ( full_name )
    `);
    if (data) setCourses(data);
  }

  async function handleAddTeacher(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from('users').insert({
      full_name: teacherName,
      phone_number: teacherPhone,
      role: 'teacher',
    });
    setTeacherName('');
    setTeacherPhone('');
    fetchTeachers();
  }

  async function handleOnboardStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!photo || !teacherId) return alert('Please select a photo and assign a teacher.');

    // 1. Upload Student Photo
    const filePath = `students/${Date.now()}_${photo.name}`;
    await supabase.storage.from('student-photos').upload(filePath, photo);
    const photoUrl = supabase.storage.from('student-photos').getPublicUrl(filePath).data.publicUrl;

    // 2. Insert Student User
    const { data: user } = await supabase
      .from('users')
      .insert({ full_name: fullName, phone_number: phone, role: 'student' })
      .select()
      .single();

    // 3. Insert Student Profile
    const { data: profile } = await supabase
      .from('student_profiles')
      .insert({ user_id: user.id, photo_url: photoUrl, license_type: licenseType })
      .select()
      .single();

    // 4. Create Course Record
    await supabase.from('courses').insert({
      student_id: profile.id,
      teacher_id: teacherId,
      status: 'assigned',
      total_required_sessions: 10,
    });

    alert('Student onboarded and assigned to teacher successfully!');
    setFullName('');
    setPhone('');
    setPhoto(null);
    fetchCourses();
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">School Admin Portal</h1>
          <p className="text-sm text-slate-500">Manage driving practical courses & teacher assignments</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Onboarding Forms */}
        <div className="space-y-6">
          {/* Add Teacher Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Register New Teacher</h2>
            <form onSubmit={handleAddTeacher} className="space-y-3">
              <input
                type="text"
                placeholder="Teacher Full Name"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                className="w-full p-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                required
                className="w-full p-2 border rounded-lg text-sm"
              />
              <button type="submit" className="w-full py-2 bg-slate-800 text-white font-bold text-xs rounded-lg">
                Add Teacher
              </button>
            </form>
          </div>

          {/* Onboard Student Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Onboard & Assign Student</h2>
            <form onSubmit={handleOnboardStudent} className="space-y-3">
              <input
                type="text"
                placeholder="Student Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full p-2 border rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full p-2 border rounded-lg text-sm"
              />
              <select
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-white"
              >
                <option value="Category_A">Category A (Motorcycle)</option>
                <option value="Category_B">Category B (Passenger Car)</option>
                <option value="Category_C">Category C (Commercial Commercial)</option>
              </select>

              <div>
                <label className="text-xs text-slate-500 font-semibold">Student Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-semibold">Assign Teacher</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  required
                  className="w-full p-2 border rounded-lg text-sm bg-white mt-1"
                >
                  <option value="">Select Teacher...</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-lg">
                Onboard Student
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Active Courses Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Active Driving Courses</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">License</th>
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="p-3 font-semibold text-slate-800">
                      {c.student_profiles?.users?.full_name}
                    </td>
                    <td className="p-3">{c.student_profiles?.license_type}</td>
                    <td className="p-3">{c.teacher?.full_name || 'Unassigned'}</td>
                    <td className="p-3">
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {c.status === 'completed' ? (
                        <a
                          href={c.final_pdf_url}
                          target="_blank"
                          className="text-blue-600 font-bold hover:underline"
                        >
                          Download PDF
                        </a>
                      ) : (
                        <span className="text-slate-400">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
