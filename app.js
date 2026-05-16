// ১. Supabase Initialization (তোমাৰ প্ৰকৃত ক্ৰেডেন্সিয়েলছ যোগ কৰা হ’ল)
const SUPABASE_URL = 'https://oblvgjnyecvvnnnesegl.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_ekuwTZtgiCXsGRBWJXqyZQ_T8xUYVpxq5U59b3Wnsh48bU7'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentEditId = null;

window.addEventListener('DOMContentLoaded', () => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) showDashboard();
    });

    document.getElementById('btnStaffLogin').addEventListener('click', handleLogin);
    document.getElementById('btnPatientBooking').addEventListener('click', showBookingForm);
    document.getElementById('btnSubmitBooking').addEventListener('click', submitBooking);
    document.getElementById('btnSavePatient').addEventListener('click', savePatientRecord);
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    document.getElementById('searchBox').addEventListener('keyup', filterPatients);
    
    setupTabs();
});

// সুৰক্ষিত লগইন
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if(!email || !password) return alert('ইমেইল আৰু পাছৱৰ্ড লিখক।');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert('লগইন ব্যৰ্থ: ' + error.message);
    else showDashboard();
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('publicBookingSection').classList.add('hidden');
    document.getElementById('appDashboard').classList.remove('hidden');
    loadPatients();
    loadBookings();
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

function showBookingForm() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('publicBookingSection').classList.remove('hidden');
}

// ডাটা লোড আৰু ছেভ লজিক
async function loadPatients() {
    const { data, error } = await supabaseClient.from('clinic_data').select('*').order('created_at', { ascending: false });
    if (error) return console.error(error);
    const container = document.getElementById('listPatients');
    container.innerHTML = '';
    data.forEach(p => container.appendChild(createPatientCard(p)));
}

function createPatientCard(p) {
    const card = document.createElement('div');
    card.className = 'bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4';
    
    const info = document.createElement('div');
    info.innerHTML = `<h4 class="text-lg font-bold text-green-900">${escapeHTML(p.name)} <span class="text-sm font-normal text-gray-500">(${escapeHTML(p.age || 'N/A')})</span></h4>
                      <p class="text-sm text-gray-600">📞 ${escapeHTML(p.phone)} | 🩺 BP: ${escapeHTML(p.bp || 'N/A')}</p>
                      <p class="text-xs text-gray-500 mt-1"><b>History:</b> ${escapeHTML(p.history || 'None')}</p>`;
    
    const actions = document.createElement('div');
    actions.className = 'flex gap-2 w-full md:w-auto';

    const btnPrint = document.createElement('button');
    btnPrint.className = 'bg-gray-700 text-white px-3 py-2 rounded-lg text-xs font-bold';
    btnPrint.innerHTML = '<i class="fas fa-print"></i>';
    btnPrint.onclick = () => printPrescription(p);

    const btnWA = document.createElement('button');
    btnWA.className = 'bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold';
    btnWA.innerHTML = '<i class="fab fa-whatsapp"></i> Rx';
    btnWA.onclick = () => sendWhatsAppRx(p);

    const btnEdit = document.createElement('button');
    btnEdit.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold';
    btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
    btnEdit.onclick = () => loadPatientToForm(p);

    actions.append(btnPrint, btnWA, btnEdit);
    card.append(info, actions);
    return card;
}

async function savePatientRecord() {
    const name = document.getElementById('pName').value;
    if(!name) return alert('ৰোগীৰ নাম বাধ্যতামূলক।');

    const patientData = {
        name,
        age: document.getElementById('pAgeSex').value,
        bp: document.getElementById('pBP').value,
        phone: document.getElementById('pPhone').value,
        history: document.getElementById('pHistory').value,
        medicine: document.getElementById('pMedicine').value,
        fees: parseInt(document.getElementById('pFees').value) || 0
    };

    if (currentEditId) {
        await supabaseClient.from('clinic_data').update(patientData).eq('id', currentEditId);
        alert('প্ৰেচক্ৰিপচন আপডেট হ’ল।');
    } else {
        await supabaseClient.from('clinic_data').insert([patientData]);
        alert('নতুন ৰেকৰ্ড সংৰক্ষণ হ’ল।');
    }
    currentEditId = null;
    document.getElementById('formTitle').innerText = 'নতুন ৰোগীৰ প্ৰেচক্ৰিপচন এন্ট্ৰি';
    clearForm();
    loadPatients();
}

// অনলাইন বুকিং চাবমিট
async function submitBooking() {
    const name = document.getElementById('bName').value;
    const phone = document.getElementById('bPhone').value;
    const txn_id = document.getElementById('bTxnId').value;
    const problem = document.getElementById('bProblem').value;

    if(!name || !phone || !txn_id) return alert('সকলো বাধ্যতামূলক পথাৰ পূৰণ কৰক।');

    const { error } = await supabaseClient.from('clinic_bookings').insert([{ name, phone, txn_id, problem }]);
    if (error) alert('বুকিং ব্যৰ্থ হৈছে বা এই Txn ID ইতিমধ্যে ব্যৱহাৰ হৈছে।');
    else {
        alert('আপোনাৰ বুকিং অনুৰোধ সফলতাৰে গ্ৰহণ কৰা হৈছে।');
        location.reload();
    }
}

async function loadBookings() {
    const { data, error } = await supabaseClient.from('clinic_bookings').select('*').order('created_at', { ascending: false });
    if(error) return;
    const container = document.getElementById('listBookings');
    container.innerHTML = data.map(b => `
        <div class="p-4 border rounded-xl bg-gray-50 flex justify-between items-center">
            <div>
                <h5 class="font-bold text-gray-900">${escapeHTML(b.name)} (${escapeHTML(b.phone)})</h5>
                <p class="text-xs text-red-600 font-mono">Txn ID: ${escapeHTML(b.txn_id)}</p>
                <p class="text-sm text-gray-600 mt-1">${escapeHTML(b.problem || 'No description')}</p>
            </div>
            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">Pending</span>
        </div>
    `).join('');
}

// ৱাটচএপ আৰু প্ৰিন্ট
function sendWhatsAppRx(p) {
    if(!p.phone) return alert('মোবাইল নম্বৰ নাই।');
    const fbLink = "https://facebook.com/drharisclinic"; 
    const msg = `🏥 *DR. HARIS HOMEOPATHIC CLINIC*\n📍 গোগামুখ, অসম\n\n*Patient:* ${p.name}\n*Age/Sex:* ${p.age || 'N/A'}\n\n*Rx:*\n${p.medicine}\n\n🌐 *FB Page:* ${fbLink}`;
    window.open(`https://api.whatsapp.com/send?phone=${p.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank');
}

function printPrescription(p) {
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `<h1>DR. HARIS CLINIC</h1><hr><p><b>Name:</b> ${escapeHTML(p.name)}</p><p><b>Rx:</b><br>${escapeHTML(p.medicine).replace(/\n/g, '<br>')}</p>`;
    window.print();
}

// Helpers
function escapeHTML(str) { return str ? str.replace(/[&<>'"]/g, t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t)) : ''; }
function filterPatients() {
    const term = document.getElementById('searchBox').value.toLowerCase();
    document.querySelectorAll('#listPatients > div').forEach(c => c.style.display = c.innerText.toLowerCase().includes(term) ? 'flex' : 'none');
}
function clearForm() { ['pName', 'pAgeSex', 'pBP', 'pPhone', 'pHistory', 'pMedicine', 'pFees'].forEach(id => document.getElementById(id).value = ''); }
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('text-green-800', 'border-b-2', 'border-green-800'));
            btn.classList.add('text-green-800', 'border-b-2', 'border-green-800');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
        });
    });
}
