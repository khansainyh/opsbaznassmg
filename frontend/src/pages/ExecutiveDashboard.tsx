import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  ChevronRight,
  TrendingUp,
  Minus,
  HandCoins,
  Banknote,
  PiggyBank,
  Users,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  bigThreeData,
  proporsiPilar,
  trenBulanan,
  topProgram,
  tahunAnggaran,
} from '../data/executiveDashboardData';

// ─── Helpers ────────────────────────────────────────────────
const formatRupiah = (val: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(val);


const pct = (v: number, t: number) => Math.round((v / t) * 100);

// ─── Custom Tooltip ─────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <p className="font-black text-slate-600 uppercase tracking-wider">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500 font-medium">{p.name}:</span>
          <span className="font-black text-slate-800">{formatRupiah(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PilarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-xl p-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-black text-slate-800">{d.nama}</p>
      <p className="text-slate-500">Realisasi: <span className="font-bold text-slate-700">{formatRupiah(d.realisasi)}</span></p>
      <p className="text-slate-500">Target: <span className="font-bold text-slate-700">{formatRupiah(d.target)}</span></p>
      <p className="text-slate-500">Penerima: <span className="font-bold text-slate-700">{d.penerima} orang</span></p>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────
export default function ExecutiveDashboard() {
  const { pengumpulan, pendistribusian, sisaAnggaran } = bigThreeData;

  const pctPengumpulan = pct(pengumpulan.realisasi, pengumpulan.target);
  const pctDistribusi = pct(pendistribusian.realisasi, pendistribusian.target);
  const totalPenerima = useMemo(() => proporsiPilar.reduce((a, b) => a + b.penerima, 0), []);

  const pieData = useMemo(() =>
    proporsiPilar.map(p => ({ ...p, value: p.realisasi })),
  []);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-8 bg-slate-50/50">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <nav className="flex text-sm gap-2 items-center">
          <span className="text-slate-400">Dashboard</span>
          <ChevronRight className="size-4 text-slate-300" />
          <span className="text-primary font-bold">Executive</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Pimpinan</h2>
            <p className="text-slate-500 font-medium text-sm">Tahun Anggaran {tahunAnggaran} · Posisi per {bigThreeData.pengumpulan.bulan}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-white border border-slate-200 px-4 py-2 rounded-full shadow-sm">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Data Real-time
          </div>
        </div>
      </motion.div>

      {/* ── THE BIG 3 ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Card Pengumpulan */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
          <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 -bottom-8 size-24 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                <HandCoins className="size-6" />
              </div>
              <div className="flex items-center gap-1 text-xs font-black bg-white/15 px-2.5 py-1 rounded-full">
                <TrendingUp className="size-3" />
                {pctPengumpulan}%
              </div>
            </div>
            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Total Pengumpulan ZIS</p>
            <h3 className="text-3xl font-black leading-tight mb-1">{formatRupiah(pengumpulan.realisasi)}</h3>
            <p className="text-white/60 text-xs font-medium">dari target {formatRupiah(pengumpulan.target)}</p>
            {/* Progress bar */}
            <div className="mt-4 bg-white/20 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-white transition-all" style={{ width: `${Math.min(pctPengumpulan, 100)}%` }} />
            </div>
            <p className="text-white/50 text-[10px] mt-1.5 font-medium">{pctPengumpulan}% dari target tahun {tahunAnggaran}</p>
          </div>
        </div>

        {/* Card Pendistribusian */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/20">
          <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 -bottom-8 size-24 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                <Banknote className="size-6" />
              </div>
              <div className="flex items-center gap-1 text-xs font-black bg-white/15 px-2.5 py-1 rounded-full">
                <TrendingUp className="size-3" />
                {pctDistribusi}%
              </div>
            </div>
            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Total Pendistribusian</p>
            <h3 className="text-3xl font-black leading-tight mb-1">{formatRupiah(pendistribusian.realisasi)}</h3>
            <p className="text-white/60 text-xs font-medium">dari pagu {formatRupiah(pendistribusian.target)}</p>
            <div className="mt-4 bg-white/20 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-white transition-all" style={{ width: `${Math.min(pctDistribusi, 100)}%` }} />
            </div>
            <p className="text-white/50 text-[10px] mt-1.5 font-medium">{totalPenerima} mustahik terlayani</p>
          </div>
        </div>

        {/* Card Sisa Anggaran */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 -bottom-8 size-24 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm">
                <PiggyBank className="size-6" />
              </div>
              <div className="flex items-center gap-1 text-xs font-black bg-white/15 px-2.5 py-1 rounded-full">
                <Minus className="size-3" />
                Saldo
              </div>
            </div>
            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Sisa Anggaran Tersedia</p>
            <h3 className="text-3xl font-black leading-tight mb-1">{formatRupiah(sisaAnggaran.nilai)}</h3>
            <p className="text-white/60 text-xs font-medium">{sisaAnggaran.keterangan}</p>
            <div className="mt-4 bg-white/20 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-white transition-all"
                style={{ width: `${Math.min(pct(sisaAnggaran.nilai, pengumpulan.realisasi), 100)}%` }}
              />
            </div>
            <p className="text-white/50 text-[10px] mt-1.5 font-medium">
              {pct(sisaAnggaran.nilai, pengumpulan.realisasi)}% dari total pengumpulan
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Row 2: Tren Bulanan + Proporsi Pilar ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        {/* Tren Bulanan - Area Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-slate-900">Tren Pengumpulan & Penyaluran</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Perbandingan bulanan tahun {tahunAnggaran}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trenBulanan} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gPengumpulan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary, #16a34a)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--color-primary, #16a34a)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPenyaluran" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bulan" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatRupiah(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={64} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="pengumpulan" name="Pengumpulan" stroke="#16a34a" strokeWidth={2.5} fill="url(#gPengumpulan)" dot={{ fill: '#16a34a', r: 3 }} />
              <Area type="monotone" dataKey="penyaluran" name="Penyaluran" stroke="#10b981" strokeWidth={2.5} fill="url(#gPenyaluran)" dot={{ fill: '#10b981', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="size-2.5 rounded-full bg-primary" />Pengumpulan</div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="size-2.5 rounded-full bg-emerald-500" />Penyaluran</div>
          </div>
        </div>

        {/* Proporsi Pilar - Pie Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="mb-4">
            <h3 className="font-black text-slate-900">Proporsi per Pilar</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Realisasi penyaluran {tahunAnggaran}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.warna} />
                ))}
              </Pie>
              <Tooltip content={<PilarTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {proporsiPilar.map(p => (
              <div key={p.kode} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: p.warna }} />
                  <span className="text-[11px] font-bold text-slate-600 leading-tight">{p.nama}</span>
                </div>
                <span className="text-[11px] font-black text-slate-800">{formatRupiah(p.realisasi)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Row 3: Realisasi per Pilar (Bar) + Top Program ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-6"
      >
        {/* Bar chart realisasi vs target per pilar */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="mb-6">
            <h3 className="font-black text-slate-900">Realisasi vs Target per Pilar</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Perbandingan penyaluran terhadap pagu program</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={proporsiPilar} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="nama" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => formatRupiah(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realisasi" name="Realisasi" radius={[4, 4, 0, 0]}>
                {proporsiPilar.map((entry, i) => (
                  <Cell key={i} fill={entry.warna} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="size-2.5 rounded-full bg-slate-200" />Target</div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><span className="size-2.5 rounded-full bg-primary" />Realisasi</div>
          </div>
        </div>

        {/* Top 5 Program */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-black text-slate-900">Top 5 Program Tersalur</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Program dengan nilai penyaluran terbesar</p>
          </div>
          <div className="flex-1 space-y-3">
            {topProgram.map((p, idx) => {
              const maxTotal = Math.max(...topProgram.map(x => x.total));
              const barWidth = Math.round((p.total / maxTotal) * 100);
              const colors = ['bg-primary', 'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500'];
              return (
                <div key={p.kode} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('size-5 rounded-md flex items-center justify-center text-[10px] font-black text-white', colors[idx])}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 leading-tight">{p.nama}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className={cn('h-1.5 rounded-full transition-all', colors[idx])} style={{ width: `${barWidth}%` }} />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black text-slate-800">{formatRupiah(p.total)}</p>
                      <p className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5 justify-end">
                        <Users className="size-2.5" />{p.jumlah} penerima
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 font-medium">Total penerima manfaat</p>
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" />
              <span className="font-black text-slate-800 text-sm">{totalPenerima} orang</span>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
