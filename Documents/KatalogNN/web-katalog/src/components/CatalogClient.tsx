"use client";

import { useState } from "react";
import imageUrlBuilder from '@sanity/image-url';
import { client } from "../sanity/client";

const builder = imageUrlBuilder(client);
function urlFor(source: any) {
  return builder.image(source).auto('format').fit('max').url();
}

const categories = ["Semua", "Katering", "Jajanan Pasar", "Snack", "Bakery"];

export default function CatalogClient({ initialProducts }: { initialProducts: any[] }) {
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = initialProducts.filter(p => {
    const matchesCategory = activeCategory === "Semua" || p.category === activeCategory;
    const nameMatch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const priceMatch = p.price?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    return matchesCategory && (nameMatch || priceMatch);
  });

  return (
    <div className="w-full bg-texture min-h-screen pb-20">
      {/* Header Katalog */}
      <div className="pt-16 pb-8 px-6 text-center">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-foreground">Katalog Menu</h1>
        <p className="text-foreground/70 max-w-2xl mx-auto mb-8">
          Silakan pilih hidangan kesukaan Anda. Jika Anda berminat, klik tombol pemesanan untuk langsung terhubung dengan admin kami via WhatsApp.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative">
          <input 
            type="text" 
            placeholder="Cari menu atau harga..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-[#E2B938]/30 focus:outline-none focus:border-primary shadow-sm bg-white"
          />
          <svg className="absolute right-4 top-3.5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-4">
        {/* Category Filter */}
        <div className="flex overflow-x-auto gap-3 pb-4 mb-10 scrollbar-hide justify-start md:justify-center">
          {categories.map((cat, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                activeCategory === cat
                ? "bg-primary text-white" 
                : "bg-white text-foreground hover:bg-primary/10 border border-[#E2B938]/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-[24px] shadow-sm border border-[#E2B938]/10 overflow-hidden hover:shadow-lg transition-shadow flex flex-col group">
                <div className="relative h-56 w-full bg-zinc-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image ? urlFor(product.image) : "/images/nasi_kotak.png"}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  {product.category && (
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-primary-dark shadow-sm">
                      {product.category}
                    </div>
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-serif text-2xl font-bold text-foreground leading-tight mb-2">{product.name}</h3>
                  <p className="text-primary-dark font-bold text-xl mb-3">{product.price}</p>
                  {product.description && (
                    <p className="text-foreground/70 text-sm mb-6 flex-1 leading-relaxed">{product.description}</p>
                  )}
                  
                  {(product.minOrder || (product.variants && product.variants.length > 0)) && (
                    <div className="bg-background rounded-2xl p-4 mb-6 border border-[#E2B938]/10">
                      {product.minOrder && (
                        <div className="flex items-start gap-2 text-sm text-foreground/80 mb-2">
                          <span className="font-bold text-foreground min-w-[70px]">Minimum:</span> 
                          <span>{product.minOrder}</span>
                        </div>
                      )}
                      {product.variants && product.variants.length > 0 && (
                        <div className="flex items-start gap-2 text-sm text-foreground/80">
                          <span className="font-bold text-foreground min-w-[70px]">Varian:</span> 
                          <span>{product.variants.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <a 
                    href={`https://wa.me/6281234567890?text=Halo%20Nyah%20N'tin,%20saya%20tertarik%20memesan%20${encodeURIComponent(product.name || "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] hover:bg-[#20b858] text-white text-center py-3.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                    Pesan Sekarang
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-foreground/60 text-lg">Wah, katalog masih kosong nih! Ayo tambahkan menu di Admin Panel.</p>
          </div>
        )}
      </main>
    </div>
  );
}
