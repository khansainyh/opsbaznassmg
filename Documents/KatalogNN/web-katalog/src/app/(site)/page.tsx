import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col w-full bg-texture">
      {/* Hero Section */}
      <section className="relative w-full py-20 px-6 flex flex-col items-center text-center">
        {/* Placeholder for Logo, user can replace src with actual logo later */}
        <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white flex items-center justify-center mb-8 shadow-sm border-4 border-white overflow-hidden">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src="/logo.jpg" alt="Logo Nyah N'tin" className="w-full h-full object-contain" />
        </div>
        
        <h1 className="font-serif text-4xl md:text-6xl font-bold text-foreground mb-6 max-w-3xl leading-tight">
          Cita Rasa Tradisional,<br/> 
          <span className="text-primary-dark">Kualitas Spesial.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mb-10 leading-relaxed">
          Nyah N'tin hadir menyajikan aneka katering, jajanan pasar, dan suguhan bakery dengan resep warisan. Diolah dengan kebersihan ekstra dan bahan-bahan pilihan untuk momen berharga Anda.
        </p>

        <Link 
          href="/katalog" 
          className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          Lihat Katalog Menu
        </Link>
      </section>

      {/* Philosophy / About Section */}
      <section className="bg-white py-20 px-6 border-y border-[#E2B938]/20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 flex flex-col gap-6">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground">Mengapa Memilih Kami?</h2>
            
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary-dark font-bold text-xl">1</span>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Resep Autentik</h3>
                <p className="text-foreground/70">Mempertahankan rasa asli jajanan dan masakan Nusantara dengan bumbu rempah pilihan.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary-dark font-bold text-xl">2</span>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Higenis & Fresh</h3>
                <p className="text-foreground/70">Dibuat fresh setiap hari berdasar pesanan untuk menjamin kualitas terbaik sampai di tangan Anda.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <span className="text-primary-dark font-bold text-xl">3</span>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Harga Terjangkau</h3>
                <p className="text-foreground/70">Kualitas premium dengan harga yang sangat bersahabat untuk memenuhi kebutuhan acara Anda.</p>
              </div>
            </div>
          </div>
          
          <div className="order-1 md:order-2 relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-zinc-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/images/jajanan_pasar.png" 
              alt="Jajanan Pasar Tradisional" 
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </section>
      
      {/* Footer Call to Action */}
      <section className="py-24 px-6 text-center">
        <h2 className="font-serif text-3xl font-bold mb-6">Siap untuk Memesan?</h2>
        <p className="text-foreground/70 mb-8 max-w-lg mx-auto">Kami menerima pesanan dalam jumlah besar untuk acara pernikahan, syukuran, meeting, dan lain-lain.</p>
        <Link 
          href="/katalog" 
          className="inline-block border-2 border-primary text-primary-dark hover:bg-primary hover:text-white px-8 py-3 rounded-full font-bold transition-colors"
        >
          Eksplor Menu Kami
        </Link>
      </section>
    </div>
  );
}
