const axios = require('axios');
axios.post('http://localhost:4000/api/mustahik/import', [
  { "NIK": "9999999999999999", "NRM": "M-001", "Nama": "Contoh Nama", "Alamat": "Jl. Contoh No. 1", "Kategori": "Fakir", "Status": "Belum" }
]).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
