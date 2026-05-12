(async () => {
  try {
    const p1 = await fetch('http://localhost:4000/api/mustahik/import', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ "NIK": "1111222233334444", "NRM": "M-999", "Nama": "Test Migrasi" }])
    });
    const d1 = await p1.json();
    console.log("Mustahik:", p1.status, d1);
  } catch(e) {
    console.log("Mustahik Error:", e.message);
  }

  try {
    const p2 = await fetch('http://localhost:4000/api/mustahik/import-riwayat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ "NIK": "1111222233334444", "Jenis_Bantuan": "Tes Bantuan", "Tanggal": "2024-01-01" }])
    });
    const d2 = await p2.json();
    console.log("Riwayat:", p2.status, d2);
  } catch(e) {
    console.log("Riwayat Error:", e.message);
  }
})();
