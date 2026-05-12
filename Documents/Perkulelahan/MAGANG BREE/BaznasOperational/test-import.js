const axios = require('axios');

const run = async () => {
    try {
        const payload = [
            {
                "NIK": "1234567890123456",
                "NRM": "M-001",
                "Nama": "Ahmad",
                "Alamat": "Jalan",
                "Kategori": "Fakir",
                "Status": "Belum"
            }
        ];
        console.log("Sending payload:", JSON.stringify(payload));
        const res = await axios.post('http://localhost:4000/api/mustahik/import', payload);
        console.log("Success:", res.data);
    } catch (e) {
        if (e.response) {
            console.log("Error:", e.response.status, e.response.data);
        } else {
            console.log("Error:", e.message);
        }
    }
}
run();
