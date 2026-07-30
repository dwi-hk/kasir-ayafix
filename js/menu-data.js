const menuDataBawaan = [
    // MINUMAN HANGAT
    { id: "MNH-01", nama: "Kopi Hitam / Tubruk", kategori: "panas", harga: 4000, hargaBeli: 2000, stok: 50, satuan: "cup" },
    { id: "MNH-02", nama: "Kopi Susu", kategori: "panas", harga: 5000, hargaBeli: 2500, stok: 50, satuan: "cup" },
    { id: "MNH-03", nama: "Teh Hangat", kategori: "panas", harga: 3000, hargaBeli: 1000, stok: 50, satuan: "cup" },
    { id: "MNH-04", nama: "Jeruk Hangat", kategori: "panas", harga: 4000, hargaBeli: 1500, stok: 50, satuan: "cup" },
    { id: "MNH-05", nama: "Jahe Hangat / Wedang", kategori: "panas", harga: 5000, hargaBeli: 2000, stok: 40, satuan: "cup" },

    // MINUMAN DINGIN
    { id: "MND-01", nama: "Es Teh Manis", kategori: "dingin", harga: 4000, hargaBeli: 1500, stok: 100, satuan: "cup" },
    { id: "MND-02", nama: "Es Jeruk", kategori: "dingin", harga: 5000, hargaBeli: 2000, stok: 100, satuan: "cup" },
    { id: "MND-03", nama: "Es Extra Joss / Susu", kategori: "dingin", harga: 6000, hargaBeli: 3000, stok: 50, satuan: "cup" },
    { id: "MND-04", nama: "Es Nutrisari", kategori: "dingin", harga: 4000, hargaBeli: 2000, stok: 50, satuan: "cup" },

    // MAKANAN / BAKARAN
    { id: "MKN-01", nama: "Seblak Komplit", kategori: "makanan", harga: 12000, hargaBeli: 6000, stok: 30, satuan: "porsi" },
    { id: "MKN-02", nama: "Sosis Bakar Jumbo", kategori: "makanan", harga: 8000, hargaBeli: 4000, stok: 25, satuan: "pcs" },
    { id: "MKN-03", nama: "Bakso Bakar (3 Tusuk)", kategori: "makanan", harga: 5000, hargaBeli: 2500, stok: 30, satuan: "porsi" },

    // TOPPING
    { id: "TPG-01", nama: "Kerupuk Mawar / Seblak", kategori: "topping", harga: 2000, hargaBeli: 800, stok: 100, satuan: "bungkus" },
    { id: "TPG-02", nama: "Dumpling Cheese", kategori: "topping", harga: 3000, hargaBeli: 1500, stok: 50, satuan: "pcs" },
    { id: "TPG-03", nama: "Telur Ayam", kategori: "topping", harga: 3000, hargaBeli: 1800, stok: 60, satuan: "butir" },

    // JAJANAN / ROKOK
    { id: "JJN-01", nama: "Rokok Ketengan", kategori: "jajanan", harga: 2500, hargaBeli: 2000, stok: 100, satuan: "batang" },
    { id: "JJN-02", nama: "Keripik Kaca", kategori: "jajanan", harga: 5000, hargaBeli: 3000, stok: 40, satuan: "pcs" }
];

let databaseMenu = [...menuDataBawaan];