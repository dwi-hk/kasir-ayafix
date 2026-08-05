/* AYA GROUP – MULTY PAYMENT
 * Core Firebase/Data Layer
 * ADDITIVE ONLY: tidak menghapus node/data lama.
 */

const AYA_FIREBASE_CONFIG = window.AYA_FIREBASE_CONFIG || {
  apiKey: "AIzaSyCx0u4ka3lhjiPm84hI8U7v37GNusCvPaE",
  authDomain: "kasir-aya-group-e6fb4.firebaseapp.com",
  databaseURL: "https://kasir-aya-group-e6fb4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kasir-aya-group-e6fb4",
  storageBucket: "kasir-aya-group-e6fb4.firebasestorage.app",
  messagingSenderId: "654765768336",
  appId: "1:654765768336:web:7fb865aaf00e371de36215"
};

let db = null;
let auth = null;
try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(AYA_FIREBASE_CONFIG);
    db = firebase.database();
    if (firebase.auth) auth = firebase.auth();
    console.info('[AYA] Firebase connected');
  }
} catch (e) { console.error('[AYA] Firebase init failed', e); }

const AYA_PATHS = Object.freeze({
  legacyMenu:'menu_tambahan', sales:'transaksi', expenses:'pengeluaran', purchases:'pembelian', consign:'barang_titipan', settings:'pengaturan',
  branches:'cabang', products:'produk', stock:'stok_cabang', customers:'pelanggan', suppliers:'supplier', employees:'karyawan', attendance:'absensi',
  inventory:'inventaris', transfers:'transfer_stock', payments:'pembayaran', operations:'operasional', users:'users', contracts:'kontrak_kerja', sop:'sop', audit:'audit_log', held:'transaksi_ditahan'
});

let keranjang = [];
let transaksiDitahan = [];
let cabangAktif = 'AYA SEBLAK DAN ANGKRINGAN';
let kategoriAktif = 'topping';
let metodePembayaran = 'TUNAI';
let myChart = null;
let myExpenseChart = null;
let calcExpr = '';
let modalTambahanManual = 0;

let dataTransaksiFirebase=[], dataPengeluaranFirebase=[], dataTitipanFirebase=[], dataPembelianFirebase=[];
let dataCabangFirebase=[], dataProdukFirebase=[], dataStokFirebase=[], dataPelangganFirebase=[], dataSupplierFirebase=[];
let dataKaryawanFirebase=[], dataAbsensiFirebase=[], dataInventarisFirebase=[], dataTransferFirebase=[], dataPembayaranFirebase=[], dataOperasionalFirebase=[], dataUsersFirebase=[];
let pelangganList=[], supplierList=[], karyawanList=[], absensiList=[], inventarisList=[], barangTitipan=[], riwayatTransaksi=[], riwayatPengeluaran=[], pembelianList=[];

function arr(v){ return v ? Object.values(v) : []; }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:0; }
function rupiah(v){ return 'Rp ' + num(v).toLocaleString('id-ID'); }
function esc(v){ return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function selectedBranchOrDefault(){ return cabangAktif==='SEMUA CABANG' ? 'AYA SEBLAK DAN ANGKRINGAN' : cabangAktif; }
function parseNominalDinamis(x){ return num(x?.nominal ?? x?.total ?? x?.jumlah ?? x?.harga ?? 0); }
function parseTanggalISO(x){ return String(x?.tanggalISO || x?.tanggal || x?.date || String(x?.waktu||'').slice(6,10)+'-'+String(x?.waktu||'').slice(3,5)+'-'+String(x?.waktu||'').slice(0,2)).slice(0,10); }
function ensureDb(){ if(!db){ alert('Firebase belum terhubung. Periksa konfigurasi dan koneksi internet.'); return false; } return true; }
async function saveNode(path,id,data){ if(!ensureDb()) return false; await db.ref(`${path}/${id}`).set(data); return true; }
async function updateNode(path,id,data){ if(!ensureDb()) return false; await db.ref(`${path}/${id}`).update(data); return true; }
async function audit(action,data={}){ if(!db) return; const id='AUD-'+Date.now()+'-'+Math.random().toString(36).slice(2,7); await db.ref(`${AYA_PATHS.audit}/${id}`).set({id,action,user:currentUserEmail||'local',waktu:new Date().toISOString(),cabang:cabangAktif,...data}); }

let currentUserRole='OWNER', currentUserName='Owner', currentUserEmail='';
function can(role){ const rank={KASIR:1,SUPERVISOR:2,OWNER:3}; return (rank[currentUserRole]||3)>=(rank[role]||3); }
function applyRoleAccess(){
  const restricted=[['btn-tab-user','OWNER'],['btn-tab-setting','OWNER'],['btn-tab-master','KASIR'],['btn-tab-cabang','KASIR'],['btn-tab-pembelian','KASIR'],['btn-tab-pengeluaran','KASIR'],['btn-tab-laporan','SUPERVISOR'],['btn-tab-laporan_pengeluaran','SUPERVISOR'],['btn-tab-backoffice','OWNER']];
  restricted.forEach(([id,r])=>{const e=document.getElementById(id); if(e) e.style.display=can(r)?'flex':'none';});
  const rb=document.getElementById('userRoleBadge'); if(rb) rb.textContent=currentUserRole;
  const nb=document.getElementById('userNameBadge'); if(nb) nb.textContent=currentUserName;
}

function mergeIntoMenu(items){
  if(typeof databaseMenu==='undefined') return;
  (items||[]).forEach(item=>{ if(!item||item.id==null)return; const i=databaseMenu.findIndex(x=>String(x.id)===String(item.id)); if(i>=0) databaseMenu[i]={...databaseMenu[i],...item}; else databaseMenu.push(item); });
}
function setArray(name,items){
  switch(name){
    case 'sales': dataTransaksiFirebase=items; break; case 'expenses': dataPengeluaranFirebase=items; break; case 'consign': dataTitipanFirebase=items; break; case 'purchases': dataPembelianFirebase=items; break;
    case 'branches': dataCabangFirebase=items; break; case 'products': dataProdukFirebase=items; break; case 'stock': dataStokFirebase=items; break; case 'customers': dataPelangganFirebase=items; break;
    case 'suppliers': dataSupplierFirebase=items; break; case 'employees': dataKaryawanFirebase=items; break; case 'attendance': dataAbsensiFirebase=items; break; case 'inventory': dataInventarisFirebase=items; break;
    case 'transfers': dataTransferFirebase=items; break; case 'payments': dataPembayaranFirebase=items; break; case 'operations': dataOperasionalFirebase=items; break; case 'users': dataUsersFirebase=items; break;
  }
}
function syncLocalArrays(){
  pelangganList=dataPelangganFirebase; supplierList=dataSupplierFirebase; karyawanList=dataKaryawanFirebase; absensiList=dataAbsensiFirebase; inventarisList=dataInventarisFirebase; barangTitipan=dataTitipanFirebase; riwayatTransaksi=dataTransaksiFirebase; riwayatPengeluaran=dataPengeluaranFirebase; pembelianList=dataPembelianFirebase;
}

async function ensureDefaultBranches(){
  if(!db)return;
  const snap=await db.ref(AYA_PATHS.branches).once('value');
  if(snap.exists()) return;
  const defaults={
    'BR-DAPUR-AYA':{id:'BR-DAPUR-AYA',nama:'DAPUR AYA SEMBAKO',aktif:true},
    'BR-SEBLAK-AYA':{id:'BR-SEBLAK-AYA',nama:'AYA SEBLAK DAN ANGKRINGAN',aktif:true}
  };
  await db.ref(AYA_PATHS.branches).set(defaults);
}

function renderBranchSelectors(){
  const names=dataCabangFirebase.filter(x=>x.aktif!==false).map(x=>x.nama).filter(Boolean);
  const defaults=['DAPUR AYA SEMBAKO','AYA SEBLAK DAN ANGKRINGAN'];
  const branches=[...new Set([...defaults,...names])];
  const sel=document.getElementById('selectCabangAktif'); if(!sel)return;
  const current=cabangAktif;
  sel.innerHTML='<option value="SEMUA CABANG">🌐 Semua Cabang</option>'+branches.map(n=>`<option value="${esc(n)}">🏢 ${esc(n)}</option>`).join('');
  sel.value=branches.includes(current)?current:'AYA SEBLAK DAN ANGKRINGAN';
  cabangAktif=sel.value;
  ['lblCabangKasir','txtCabangInv'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=cabangAktif;});
}

function listen(path,key,cb){
  if(!db)return;
  db.ref(path).on('value',s=>{const items=arr(s.val()); setArray(key,items); if(cb)cb(items);});
}

async function initAYA(){
  if(!db){ window.dispatchEvent(new Event('aya-ready')); return; }
  try{ await ensureDefaultBranches(); }catch(e){console.warn('branch init',e); }
  listen(AYA_PATHS.branches,'branches',()=>{renderBranchSelectors(); if(typeof renderInventaris==='function')renderInventaris();});
  listen(AYA_PATHS.legacyMenu,'products',items=>{mergeIntoMenu(items); if(typeof renderMasterData==='function')renderMasterData();if(typeof renderOpsiMasterPembelian==='function')renderOpsiMasterPembelian();if(typeof renderMenu==='function')renderMenu();});
  listen(AYA_PATHS.products,'products',items=>{mergeIntoMenu(items); if(typeof renderMasterData==='function')renderMasterData();if(typeof renderOpsiMasterPembelian==='function')renderOpsiMasterPembelian();if(typeof renderMenu==='function')renderMenu();});
  listen(AYA_PATHS.sales,'sales',()=>{syncLocalArrays(); if(typeof updateLaporan==='function')updateLaporan();});
  listen(AYA_PATHS.expenses,'expenses',()=>{syncLocalArrays(); if(typeof updateLaporan==='function')updateLaporan();if(typeof updateLaporanPengeluaran==='function')updateLaporanPengeluaran();});
  listen(AYA_PATHS.purchases,'purchases',()=>{syncLocalArrays();if(typeof renderPembelian==='function')renderPembelian();});
  listen(AYA_PATHS.consign,'consign',()=>{syncLocalArrays();if(typeof renderBarangTitipan==='function')renderBarangTitipan();});
  listen(AYA_PATHS.customers,'customers',()=>{syncLocalArrays();if(typeof renderPelanggan==='function')renderPelanggan();});
  listen(AYA_PATHS.suppliers,'suppliers',()=>{syncLocalArrays();if(typeof renderSupplier==='function')renderSupplier();});
  listen(AYA_PATHS.employees,'employees',()=>{syncLocalArrays();if(typeof renderKaryawan==='function')renderKaryawan();});
  listen(AYA_PATHS.attendance,'attendance',()=>{syncLocalArrays();if(typeof renderAttendance==='function')renderAttendance();});
  listen(AYA_PATHS.inventory,'inventory',()=>{syncLocalArrays();if(typeof renderInventaris==='function')renderInventaris();});
  listen(AYA_PATHS.stock,'stock',()=>{syncLocalArrays();if(typeof renderInventaris==='function')renderInventaris();});
  listen(AYA_PATHS.transfers,'transfers',()=>{syncLocalArrays();if(typeof renderTransfers==='function')renderTransfers();});
  listen(AYA_PATHS.payments,'payments',()=>{syncLocalArrays();if(typeof renderPaymentHistory==='function')renderPaymentHistory();});
  listen(AYA_PATHS.operations,'operations',()=>{syncLocalArrays();if(typeof updateLaporanPengeluaran==='function')updateLaporanPengeluaran();});
  listen(AYA_PATHS.users,'users',items=>{dataUsersFirebase=items; if(typeof renderUserManagement==='function')renderUserManagement();});
  db.ref('pengaturan/modal_laci').on('value',s=>{modalTambahanManual=num(s.val());const e=document.getElementById('inputTambahModalLaci');if(e)e.value=modalTambahanManual;if(typeof updateLaporan==='function')updateLaporan();});
  if(auth){ auth.onAuthStateChanged(async user=>{ if(!user){applyRoleAccess();return;} currentUserEmail=user.email||''; try{const s=await db.ref(`${AYA_PATHS.users}/${user.uid}`).once('value'); const p=s.val()||{}; currentUserRole=p.role||'OWNER'; currentUserName=p.nama||user.email||'User';}catch(e){} applyRoleAccess(); }); }
  window.dispatchEvent(new Event('aya-ready'));
}

document.addEventListener('DOMContentLoaded',()=>{initAYA();});
