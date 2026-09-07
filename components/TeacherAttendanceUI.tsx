'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import SignatureCanvas from 'react-signature-canvas';

interface AttendanceLog {
  id: string;
  session_number: number;
  scheduled_date: string;
  status: 'pending' | 'present' | 'absent';
  teacher_notes: string;
}

interface Course {
  id: string;
  student_profiles: {
    user_id: string;
    photo_url: string;
    license_type: string;
    users: { full_name: string; phone_number: string };
  };
  total_required_sessions: number;
  status: string;
}

export default function TeacherAttendanceUI({ teacherId }: { teacherId: string }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Signature Refs
  const teacherSigRef = useRef<SignatureCanvas>(null);
  const studentSigRef = useRef<SignatureCanvas>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    fetchTeacherCourses();
  }, [teacherId]);

  async function fetchTeacherCourses() {
    const { data } = await supabase
      .from('courses')
      .select(`
        *,
        student_profiles (
          photo_url,
          license_type,
          users ( full_name, phone_number )
        )
      `)
      .eq('teacher_id', teacherId)
      .neq('status', 'completed');

    if (data) {
      setCourses(data as any);
      if (data.length > 0) fetchAttendanceLogs(data[0].id);
    }
    setLoading(false);
  }

  async function fetchAttendanceLogs(courseId: string) {
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('course_id', courseId)
      .order('session_number', { ascending: true });

    if (data) setLogs(data);
  }

  // Toggle Attendance Status
  async function toggleStatus(logId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'present' ? 'absent' : 'present';

    const { error } = await supabase
      .from('attendance_logs')
      .update({ status: nextStatus, marked_at: new Date().toISOString() })
      .eq('id', logId);

    if (!error) {
      setLogs((prev) =>
        prev.map((item) => (item.id === logId ? { ...item, status: nextStatus as any } : item))
      );
    }
  }

  // Upload Signatures and Complete Course
  async function handleFinalSubmit() {
    if (!selectedCourse || !teacherSigRef.current || !studentSigRef.current) return;

    setIsFinalizing(true);

    // Convert Canvas Signatures to Data URLs/Blobs
    const teacherData = teacherSigRef.current.getTrimmedCanvas().toDataURL('image/png');
    const studentData = studentSigRef.current.getTrimmedCanvas().toDataURL('image/png');

    // 1. Upload Signatures to Supabase Storage
    const teacherFileName = `signatures/teacher_${selectedCourse.id}.png`;
    const studentFileName = `signatures/student_${selectedCourse.id}.png`;

    await supabase.storage
      .from('signatures')
      .upload(teacherFileName, dataURItoBlob(teacherData), { upsert: true });

    await supabase.storage
      .from('signatures')
      .upload(studentFileName, dataURItoBlob(studentData), { upsert: true });

    const teacherSigUrl = supabase.storage.from('signatures').getPublicUrl(teacherFileName).data.publicUrl;
    const studentSigUrl = supabase.storage.from('signatures').getPublicUrl(studentFileName).data.publicUrl;

    // 2. Mark Course Completed
    await supabase
      .from('courses')
      .update({
        status: 'completed',
        teacher_signature_url: teacherSigUrl,
        student_signature_url: studentSigUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', selectedCourse.id);

    alert('Course finalized! Ready for PDF generation.');
    setIsFinalizing(false);
    fetchTeacherCourses();
  }

  function dataURItoBlob(dataURI: string) {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  }

  if (loading) return <p className="p-4 text-center">Loading assigned students...</p>;

  const completedCount = logs.filter((l) => l.status === 'present').length;
  const isCourseReadyToSign = completedCount >= (selectedCourse?.total_required_sessions || 10);

  return (
    <div className="space-y-4 max-w-md mx-auto p-2">
      {/* Student Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <label className="text-xs font-semibold text-gray-500 uppercase">Select Student</label>
        <select
          className="w-full mt-1 p-2 border rounded-lg bg-gray-50 text-sm font-medium"
          onChange={(e) => {
            const course = courses.find((c) => c.id === e.target.value);
            if (course) {
              setSelectedCourse(course);
              fetchAttendanceLogs(course.id);
            }
          }}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.student_profiles.users.full_name} ({c.student_profiles.license_type})
            </option>
          ))}
        </select>
      </div>

      {/* Progress Header */}
      {selectedCourse && (
        <div className="bg-blue-600 text-white p-4 rounded-xl shadow">
          <p className="text-xs text-blue-100">Course Progress</p>
          <div className="flex justify-between items-end mt-1">
            <h2 className="text-xl font-bold">
              {completedCount} / {selectedCourse.total_required_sessions} Lessons
            </h2>
            <span className="text-xs bg-blue-500 px-2 py-1 rounded">
              License: {selectedCourse.student_profiles.license_type}
            </span>
          </div>
        </div>
      )}

      {/* Attendance Grid */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">Practical Sessions Log</h3>
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
          >
            <div>
              <p className="font-semibold text-sm text-gray-800">Lesson #{log.session_number}</p>
              <p className="text-xs text-gray-400">
                {new Date(log.scheduled_date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => toggleStatus(log.id, log.status)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                log.status === 'present'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {log.status === 'present' ? '✓ Present' : '✕ Absent'}
            </button>
          </div>
        ))}
      </div>

      {/* Course Finalization & Digital Signature Canvas */}
      {isCourseReadyToSign && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl space-y-4 mt-6">
          <h3 className="font-bold text-yellow-800 text-sm">Course Complete: Signatures Required</h3>

          {/* Teacher Signature */}
          <div>
            <label className="text-xs font-semibold text-gray-700">Teacher Signature</label>
            <div className="border bg-white rounded-lg mt-1">
              <SignatureCanvas
                ref={teacherSigRef}
                canvasProps={{ className: 'w-full h-24 border-gray-200 rounded-lg' }}
              />
            </div>
          </div>

          {/* Student Signature */}
          <div>
            <label className="text-xs font-semibold text-gray-700">Student Signature</label>
            <div className="border bg-white rounded-lg mt-1">
              <SignatureCanvas
                ref={studentSigRef}
                canvasProps={{ className: 'w-full h-24 border-gray-200 rounded-lg' }}
              />
            </div>
          </div>

          <button
            onClick={handleFinalSubmit}
            disabled={isFinalizing}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow-md hover:bg-green-700"
          >
            {isFinalizing ? 'Finalizing Course...' : 'Complete Course & Generate PDF'}
          </button>
        </div>
      )}
    </div>
  );
}
