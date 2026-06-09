import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, Check, CalendarClock, X, Building2, MapPin, FileText, MessageSquare, ExternalLink } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

function toGDriveEmbedUrl(link: string): string | null {
  if (!link || !link.trim()) return null;
  const fileMatch = link.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  const openMatch = link.match(/[?&]id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  return null;
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} hari yang lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSuratId, setSelectedSuratId] = useState<string | null>(null);
  const [suratDetail, setSuratDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`/api/notifications/user/${user.id}`);
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every 1 min
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await axios.put(`/api/notifications/user/${user.id}/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleOpenDetail = async (suratId: string, notifId: string) => {
    markAsRead(notifId);
    setIsOpen(false);
    setSelectedSuratId(suratId);
    setIsLoadingDetail(true);
    setSuratDetail(null);
    try {
      const res = await axios.get(`/api/surats/${suratId}`);
      setSuratDetail(res.data);
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil detail surat');
      setSelectedSuratId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-50 origin-top-right"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Bell className="size-4 text-primary" /> Notifikasi
                </h3>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Anda memiliki {unreadCount} notifikasi belum dibaca
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                  title="Tandai semua sudah dibaca"
                >
                  <Check className="size-4" />
                </button>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
              {notifications.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center">
                  <Bell className="size-8 text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Belum ada notifikasi.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) markAsRead(notif.id);
                      }}
                      className={cn(
                        "p-4 cursor-pointer transition-colors hover:bg-slate-50 relative group",
                        !notif.isRead ? "bg-primary/5" : ""
                      )}
                    >
                      {!notif.isRead && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                      )}
                      <div className="flex gap-3">
                        <div className={cn(
                          "p-2 rounded-full h-fit shrink-0",
                          !notif.isRead ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                        )}>
                          <CalendarClock className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={cn(
                            "text-xs uppercase tracking-widest",
                            !notif.isRead ? "font-black text-slate-900" : "font-bold text-slate-600"
                          )}>
                            {notif.title}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-2">
                            {formatTimeAgo(notif.createdAt)}
                          </p>
                          {notif.link?.startsWith('/surat/') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(notif.link!.replace('/surat/', ''), notif.id);
                              }}
                              className="mt-3 px-3 py-1.5 bg-primary/10 hover:bg-primary hover:text-white text-primary text-[10px] font-bold rounded-lg transition-colors inline-block"
                            >
                              Lihat Detail Undangan
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Surat Detail Modal */}
      <AnimatePresence>
        {selectedSuratId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedSuratId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-black text-slate-900">Detail Penugasan Undangan</h3>
                <button onClick={() => setSelectedSuratId(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="size-5 text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {isLoadingDetail ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4" />
                    <p className="text-sm font-bold">Memuat detail...</p>
                  </div>
                ) : suratDetail ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Building2 className="size-3" /> Nama Instansi</p>
                          <p className="text-sm font-bold text-slate-900">{suratDetail.nama_instansi || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="size-3" /> Pimpinan Organisasi</p>
                          <p className="text-sm font-bold text-slate-900">{suratDetail.pimpinan_organisasi || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText className="size-3" /> Keperluan</p>
                          <p className="text-sm font-bold text-slate-900">{suratDetail.keperluan}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CalendarClock className="size-3" /> Waktu Acara</p>
                          <p className="text-sm font-bold text-slate-900">
                            {suratDetail.tanggal_acara ? new Date(suratDetail.tanggal_acara).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                            <span className="text-primary ml-2">Jam {suratDetail.jam_acara || '-'}</span>
                          </p>
                        </div>
                        {suratDetail.catatanKepala && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare className="size-3" /> Catatan Kepala Pelaksana</p>
                            <p className="text-sm text-slate-700 bg-amber-50 p-3 rounded-xl border border-amber-100 italic leading-relaxed">
                              "{suratDetail.catatanKepala}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {suratDetail.file_gdrive_link && toGDriveEmbedUrl(suratDetail.file_gdrive_link) ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                            <FileText className="size-3.5" /> Dokumen Surat
                          </h4>
                          <a href={suratDetail.file_gdrive_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                            <ExternalLink className="size-3" /> Buka di Drive
                          </a>
                        </div>
                        <iframe
                          src={toGDriveEmbedUrl(suratDetail.file_gdrive_link)!}
                          className="w-full h-80 rounded-xl border border-slate-200 shadow-sm bg-slate-100"
                          allow="autoplay"
                        />
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex flex-col items-center justify-center h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                          <FileText className="size-8 mb-2 opacity-30" />
                          <p className="text-xs font-medium">Tidak ada dokumen terlampir</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-center text-sm text-rose-500 py-12">Gagal memuat detail surat.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
