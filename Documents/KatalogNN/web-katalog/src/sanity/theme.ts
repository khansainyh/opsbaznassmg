import { buildLegacyTheme } from "sanity";

const props = {
  "--my-white": "#FDFBF4", // Krem Hangat (Background Web)
  "--my-black": "#2A241C", // Coklat Gelap (Text Web)
  "--nyah-ntin-brand": "#E2B938", // Kuning Emas/Mustard (Logo)
  "--my-green": "#558b2f", // Hijau
};

export const myTheme = buildLegacyTheme({
  /* Base theme colors */
  "--black": props["--my-black"],
  "--white": props["--my-white"],

  "--gray": "#666",
  "--gray-base": "#666",

  "--component-bg": props["--my-white"],
  "--component-text-color": props["--my-black"],

  /* Brand */
  "--brand-primary": props["--nyah-ntin-brand"],

  // Default button
  "--default-button-color": "#666",
  "--default-button-primary-color": props["--nyah-ntin-brand"],
  "--default-button-success-color": props["--my-green"],
  "--default-button-warning-color": "#f0ad4e",
  "--default-button-danger-color": "#d9534f",

  /* State */
  "--state-info-color": props["--nyah-ntin-brand"],
  "--state-success-color": props["--my-green"],
  "--state-warning-color": "#f0ad4e",
  "--state-danger-color": "#d9534f",

  /* Navbar */
  "--main-navigation-color": props["--my-black"],
  "--main-navigation-color--inverted": props["--my-white"],

  "--focus-color": props["--nyah-ntin-brand"],
});
