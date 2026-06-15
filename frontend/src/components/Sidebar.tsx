import { 
  LayoutDashboard, 
  LineChart, 
  Network, 
  Building2, 
  Users, 
  FileText, 
  ClipboardCheck, 
  ShieldCheck, 
  PenTool, 
  UserSearch, 
  Truck, 
  Target, 
  Settings2, 
  History,
  ChevronRight,
  Newspaper,
  Banknote,
  LogOut,
  KeyRound,
  ArrowRightLeft,
  BookOpen,
  RefreshCw,
  Archive,
  Upload
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/context/AuthContext';

type Role = 
  | 'Super_Admin' 
  | 'Ketua' 
  | 'Wakil_Ketua_I'
  | 'Wakil_Ketua_II'
  | 'Wakil_Ketua_III'
  | 'Wakil_Ketua_IV'
  | 'Kabag_Administrasi' 
  | 'Kabag_Pelaporan'
  | 'Kabag_Pengumpulan'
  | 'Kabag_Pendistribusian'
  | 'Kabag_Pendayagunaan'
  | 'Kepala_Pelaksana' 
  | 'Staf_Administrasi' 
  | 'Staf_Distribusi' 
  | 'Staf_Keuangan'
  | 'Staf_Pengumpulan'
  | 'Staf_Pelaporan'
  | 'Relawan'
  | 'Relawan_Sementara'
  | 'Tim_Monev'
  | 'Humas';

const menuGroups = [
  {
    title: "MENU UTAMA",
    items: [
      { name: "Executive", icon: LayoutDashboard, active: true, roles: ["Super_Admin", "Ketua", "Wakil_Ketua_I", "Wakil_Ketua_II", "Wakil_Ketua_III", "Wakil_Ketua_IV", "Kepala_Pelaksana", "Kabag_Administrasi", "Staf_Pelaporan", "Staf_Pengumpulan"] },
      { name: "Monitoring & Evaluasi", icon: LineChart, roles: ["Super_Admin", "Wakil_Ketua_I", "Staf_Pelaporan", "Staf_Pengumpulan"] },
    ]
  },
  {
    title: "MASTER DATA",
    items: [
      { name: "Pilar & Program", icon: Network, roles: ["Super_Admin", "Kepala_Pelaksana"] },
      { name: "Database UPZ", icon: Building2, roles: ["Super_Admin", "Kepala_Pelaksana", "Staf_Administrasi"] },
      { name: "Data Mustahik", icon: Users, roles: ["Super_Admin", "Kabag_Administrasi", "Staf_Administrasi", "Staf_Distribusi"] },
      { name: "Data Muzakki", icon: Users, roles: ["Super_Admin", "Staf_Pelaporan", "Staf_Pengumpulan"] },
    ]
  },
  {
    title: "ADMINISTRASI",
    items: [
      { name: "Input Proposal", icon: FileText, roles: ["Super_Admin", "Kabag_Administrasi", "Staf_Administrasi"] },
      { name: "Upload Proposal", icon: Upload, roles: ["Super_Admin", "Humas"] },
      { name: "Input Surat", icon: Newspaper, roles: ["Super_Admin", "Kabag_Administrasi", "Staf_Administrasi"] },
    ]
  },
  {
    title: "OPERASIONAL",
    items: [
      { name: "Tracking Proposal", icon: ClipboardCheck, roles: ["Super_Admin", "Ketua", "Wakil_Ketua_I", "Wakil_Ketua_II", "Wakil_Ketua_III", "Wakil_Ketua_IV", "Kepala_Pelaksana", "Kabag_Administrasi", "Staf_Administrasi", "Humas"] },
      { name: "Tracking Surat", icon: ClipboardCheck, roles: ["Super_Admin", "Kepala_Pelaksana", "Kabag_Administrasi", "Staf_Administrasi"] },
    ]
  },
  {
    title: "PERSETUJUAN",
    items: [
      { name: "Persetujuan Kepala Bagian", icon: ShieldCheck, roles: ["Super_Admin", "Kabag_Administrasi"] },
      { name: "Persetujuan Kepala Pelaksana", icon: ShieldCheck, roles: ["Super_Admin", "Kepala_Pelaksana"] },
      { name: "Persetujuan Pimpinan", icon: PenTool, roles: ["Super_Admin", "Ketua"] },
      { name: "Penentuan Nominal", icon: ShieldCheck, roles: ["Super_Admin", "Wakil_Ketua_II", "Kepala_Pelaksana"] },
    ]
  },
  {
    title: "PENGUMPULAN",
    items: [
      { name: "Penerimaan ZIS", icon: Banknote, roles: ["Super_Admin", "Staf_Pengumpulan", "Kabag_Pengumpulan", "Staf_Keuangan", "Staf_Pelaporan"] },
      { name: "Penerimaan Bank Jateng", icon: Building2, roles: ["Super_Admin", "Staf_Pengumpulan", "Kabag_Pengumpulan"] },
      { name: "Identifikasi Mutasi", icon: ArrowRightLeft, roles: ["Super_Admin", "Staf_Pengumpulan", "Kabag_Pengumpulan", "Staf_Keuangan", "Staf_Pelaporan"] },
    ]
  },
  {
    title: "PENDISTRIBUSIAN & PENDAYAGUNAAN",
    items: [
      { name: "Monitoring Tugas", icon: UserSearch, roles: ["Super_Admin", "Staf_Distribusi", "Kabag_Pendistribusian", "Kabag_Pendayagunaan"] },
      { name: "Antrean SIMBA", icon: RefreshCw, roles: ["Super_Admin", "Staf_Keuangan", "Staf_Distribusi", "Kabag_Pendistribusian", "Kabag_Pendayagunaan"] },
      { name: "Realisasi Bantuan", icon: Truck, roles: ["Super_Admin", "Wakil_Ketua_II", "Staf_Distribusi"] },
      { name: "Antrean Arsip", icon: Archive, roles: ["Super_Admin", "Wakil_Ketua_II", "Staf_Distribusi"] },
      { name: "Tim Survei", icon: ClipboardCheck, roles: ["Super_Admin", "Relawan", "Relawan_Sementara", "Tim_Monev", "Staf_Distribusi"] },
    ]
  },
  {
    title: "KEUANGAN",
    items: [
      { name: "Antrean Pencairan", icon: Banknote, roles: ["Super_Admin", "Staf_Keuangan"] },
      { name: "Simulator Pencairan", icon: ShieldCheck, roles: ["Super_Admin", "Staf_Keuangan"] },
      { name: "Pemindahan Dana", icon: ArrowRightLeft, roles: ["Super_Admin", "Staf_Keuangan"] },
      { name: "Pengeluaran Manual", icon: Banknote, roles: ["Super_Admin", "Staf_Keuangan"] },
      { name: "Pengaturan Keuangan", icon: Settings2, roles: ["Super_Admin", "Staf_Keuangan"] },
    ]
  },
  {
    title: "PELAPORAN",
    items: [
      { name: "Target RKAT", icon: Target, roles: ["Super_Admin", "Kepala_Pelaksana", "Staf_Keuangan", "Ketua", "Staf_Distribusi"] },
      { name: "Jurnal Buku Besar", icon: BookOpen, roles: ["Super_Admin", "Staf_Keuangan"] },
      { name: "Rekonsiliasi Mutasi", icon: ArrowRightLeft, roles: ["Super_Admin", "Staf_Keuangan", "Staf_Pelaporan", "Staf_Pengumpulan"] },
      { name: "Parameter Sistem", icon: Settings2, roles: ["Super_Admin", "Staf_Keuangan", "Staf_Pelaporan", "Staf_Pengumpulan"] },
    ]
  }
];

const settingsGroup = {
  title: "PENGATURAN",
  items: [
    { name: "User Management", icon: Settings2, roles: ["Super_Admin"] },
    { name: "Audit Logs", icon: History, roles: ["Super_Admin"] },
  ]
};

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (name: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ activeMenu, onMenuChange, isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const userRole = (user?.role as Role) || 'Relawan';

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-primary/10 flex flex-col h-full overflow-hidden transition-transform duration-300 xl:relative xl:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-white">
            <Building2 className="size-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-slate-900 text-lg font-bold leading-none">BAZNAS</h1>
            <p className="text-primary text-[10px] font-bold uppercase tracking-wider">OPERATIONAL HUB</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="xl:hidden p-2 text-slate-400 hover:text-slate-600"
        >
          <ChevronRight className="size-5 rotate-180" />
        </button>
      </div>

      <nav className={cn(
        "flex-1 px-4 py-4 overflow-y-auto custom-scrollbar",
        userRole === 'Super_Admin' ? "space-y-6" : "space-y-1"
      )}>
        {userRole === 'Super_Admin' ? (
          menuGroups.map((group) => {
            const visibleItems = group.items.filter(item => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
                  {group.title}
                </p>
                <div className="space-y-1">
                  {visibleItems.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => { onMenuChange(item.name); onClose(); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                        activeMenu === item.name 
                          ? "bg-primary text-white shadow-sm shadow-primary/20" 
                          : "text-slate-600 hover:bg-primary/10 hover:text-primary"
                      )}
                    >
                      <item.icon className={cn("size-[22px]", activeMenu === item.name ? "text-white" : "text-slate-500")} />
                      <span className={cn("text-sm", activeMenu === item.name ? "font-semibold" : "font-medium")}>
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          menuGroups.flatMap(g => g.items).filter(item => item.roles.includes(userRole)).map((item) => (
            <button
              key={item.name}
              onClick={() => { onMenuChange(item.name); onClose(); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                activeMenu === item.name 
                  ? "bg-primary text-white shadow-sm shadow-primary/20" 
                  : "text-slate-600 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <item.icon className={cn("size-[22px]", activeMenu === item.name ? "text-white" : "text-slate-500")} />
              <span className={cn("text-sm", activeMenu === item.name ? "font-semibold" : "font-medium")}>
                {item.name}
              </span>
            </button>
          ))
        )}
      </nav>

      <div className="p-4 mt-auto border-t border-primary/10 shrink-0">
      {settingsGroup.items.filter(item => item.roles.includes(userRole)).length > 0 && (
        <div className="space-y-1 mb-4">
          {userRole === 'Super_Admin' && (
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">
              {settingsGroup.title}
            </p>
          )}
          {settingsGroup.items.filter(item => item.roles.includes(userRole)).map((item) => (
            <button
              key={item.name}
              onClick={() => { onMenuChange(item.name); onClose(); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                activeMenu === item.name 
                  ? "bg-primary text-white shadow-sm shadow-primary/20" 
                  : "text-slate-600 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <item.icon className={cn("size-[22px]", activeMenu === item.name ? "text-white" : "text-slate-500")} />
              <span className={cn("text-sm", activeMenu === item.name ? "font-semibold" : "font-medium")}>
                {item.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {user && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate">{user.name}</span>
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">{user.role.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { onMenuChange('Ganti Password'); onClose(); }}
                className="p-2 text-slate-500 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                title="Ganti Password"
              >
                <KeyRound className="size-4" />
              </button>
              <button 
                onClick={logout}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Keluar"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </aside>
  );
}
