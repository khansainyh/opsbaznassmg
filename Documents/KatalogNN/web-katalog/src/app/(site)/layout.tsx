import Link from "next/link";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Navbar Global */}
      <nav className="w-full bg-background/80 backdrop-blur-md border-b border-[#E2B938]/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.jpg" alt="Logo Nyah N'tin" className="w-10 h-10 object-contain rounded-full bg-white shadow-sm" />
            <span className="font-serif font-bold text-xl md:text-2xl text-foreground">Nyah N'tin</span>
          </Link>
          <div className="hidden md:flex gap-6 font-medium text-sm">
            <Link href="/" className="hover:text-[#E2B938] transition-colors">Beranda</Link>
            <Link href="/katalog" className="hover:text-[#E2B938] transition-colors">Katalog Menu</Link>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
      
      {/* Footer */}
      <footer className="bg-[#2A241C] text-[#FDFBF4]/70 py-8 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Nyah N'tin. Semua Hak Dilindungi.</p>
      </footer>
    </>
  );
}
