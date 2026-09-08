import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-8">
      {/* Navigation Header */}
      <nav className="flex justify-between items-center max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold tracking-tight text-blue-400">DriveFlow</h1>
        <div className="space-x-4">
          <Link href="/auth" className="px-4 py-2 text-sm font-medium hover:text-blue-300">
            Log In
          </Link>
          <Link
            href="/auth?mode=signup"
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-lg shadow"
          >
            Register School
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto text-center space-y-6 my-16">
        <h2 className="text-5xl font-extrabold sm:text-6xl text-slate-100">
          Replace Paper Logs with Digital Driving Attendance
        </h2>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Streamline student registration, automate practical lesson schedules with teachers via Telegram, and instantly generate official stamped PDF attendance reports.
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link
            href="/auth?mode=signup"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl shadow-lg transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500">
        © {new Date().getFullYear()} DriveFlow Platform. All rights reserved.
      </footer>
    </div>
  );
}
