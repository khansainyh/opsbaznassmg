import { createClient } from "next-sanity";

export const client = createClient({
  projectId: "y0whspc7",
  dataset: "production",
  apiVersion: "2024-01-01",
  useCdn: false, // Kita matikan CDN agar data yang baru ditambahkan langsung muncul (tidak ter-cache lama)
});
