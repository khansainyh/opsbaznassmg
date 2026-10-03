import { defineField, defineType } from "sanity";

export const productType = defineType({
  name: "product",
  title: "Produk / Menu",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Nama Menu",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Foto Menu",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "price",
      title: "Harga (Cth: Rp 25.000)",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "category",
      title: "Kategori",
      type: "string",
      options: {
        list: [
          { title: "Katering", value: "Katering" },
          { title: "Jajanan Pasar", value: "Jajanan Pasar" },
          { title: "Snack", value: "Snack" },
          { title: "Bakery", value: "Bakery" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Deskripsi Singkat",
      type: "text",
    }),
    defineField({
      name: "minOrder",
      title: "Minimum Order (Cth: Min. 20 pax)",
      type: "string",
    }),
    defineField({
      name: "variants",
      title: "Varian Rasa",
      type: "array",
      of: [{ type: "string" }],
    }),
  ],
});
