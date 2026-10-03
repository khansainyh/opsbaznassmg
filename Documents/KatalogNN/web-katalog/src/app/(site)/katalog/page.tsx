import { client } from "../../../sanity/client";
import CatalogClient from "../../../components/CatalogClient";

export const revalidate = 0; // Mematikan cache agar saat Anda edit di Admin Panel, web langsung berubah saat di-refresh

export default async function KatalogPage() {
  // Mengambil semua data produk dari Sanity (diurutkan dari yang terbaru)
  const products = await client.fetch(`*[_type == "product"] | order(_createdAt desc)`);
  
  return <CatalogClient initialProducts={products} />;
}
