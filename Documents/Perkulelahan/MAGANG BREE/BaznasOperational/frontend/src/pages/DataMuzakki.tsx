import { Users } from 'lucide-react';

export default function DataMuzakki() {
  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3 text-primary">
          <Users className="size-8" />
          <h1 className="text-3xl font-bold text-slate-900">Data Muzakki</h1>
        </div>
        <p className="text-slate-500">
          Kelola master data Muzakki.
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center justify-center text-slate-400">
        <Users className="size-16 mb-4 opacity-30" />
        <h2 className="text-xl font-semibold mb-2">Belum ada data</h2>
        <p className="text-sm max-w-sm text-center">Data Muzakki kosong.</p>
      </div>
    </div>
  );
}
