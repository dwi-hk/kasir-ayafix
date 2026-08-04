document.addEventListener('DOMContentLoaded', () => {
    console.log("AYA GROUP POS System Ready!");
    cariMenuKasir();
    
    // Sync Realtime Listener jika Firebase Aktif
    if (typeof db !== 'undefined' && db) {
        db.ref('transaksi').on('value', (snapshot) => {
            const data = snapshot.val();
            if(data) {
                riwayatTransaksi = Object.values(data);
                localStorage.setItem('aya_transaksi_v3', JSON.stringify(riwayatTransaksi));
                updateLaporan();
            }
        });
    }
});

function cariMenuKasir() {
    const input = document.getElementById('cariMenuKasir');
    const key = input ? input.value.toLowerCase() : '';
    const container = document.getElementById('container-menu');
    if(!container) return;

    let filtered = databaseMenu.filter(m => m.nama.toLowerCase().includes(key));
    
    let html = '';
    filtered.forEach(m => {
        html += `
            <div onclick="tambahItem('${m.id}')" class="p-3 bg-white border border-orange-200 rounded-xl shadow-sm hover:border-orange-500 cursor-pointer flex flex-col justify-between">
                <div>
                    <p class="font-bold text-xs uppercase text-gray-800">${m.nama}</p>
                    <p class="text-[9px] text-gray-400">Modal: Rp ${m.hargaBeli.toLocaleString('id-ID')}</p>
                </div>
                <p class="font-extrabold text-orange-600 text-sm mt-2">Rp ${m.harga.toLocaleString('id-ID')}</p>
            </div>
        `;
    });
    container.innerHTML = html;
}