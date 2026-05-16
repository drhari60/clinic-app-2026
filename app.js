// Supabase Integration Setup
const SUPABASE_URL = 'https://oblvgjnyecvvnnnesegl.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_ekuwTZtgiCXsGRBWJXqYzQ_T8xUYjF9'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentEditId = null;

// Dynamic Health Tips Array
const healthTips = [
    { title: "প্ৰাকৃতিক সুষম আহাৰ লওক", content: "ফাষ্ট ফুড, জাঙ্ক ফুড বৰ্জন কৰক, সেউজীয়া শাক-পাচলি আৰু ফল-মূল বেছিকৈ খাওক।" },
    { title: "পৰ্যাপ্ত পানী খাওক", content: "দিনটোত অন্ততঃ ৩-৪ লিটাৰ পানী খাই নিজৰ শৰীৰটো হাইড্ৰেটেড কৰি ৰাখক।" },
    { title: "দৈনিক শাৰীৰিক ব্যায়াম", content: "হৃদযন্ত্ৰ সুস্থ ৰাখিবলৈ আৰু ফিট থাকিবলৈ দৈনিক ৩০-৪০ মিনিট খোজ কাঢ়ক।" },
    { title: "মানসিক চাপ মুক্ত থাকক", content: "পৰ্যাপ্ত পৰিমাণে ৭-৮ ঘণ্টা টোপনি লওক আৰু দৈনিক পুৱা যোগাসন কৰক।" }
];

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
    
    document.getElementById('btnOnlineConsult').addEventListener('click', () => {
        window.open('https://api.whatsapp.com/send?phone=919435667822&text=Hello%20Doctor,%20I%20want%20to%20book%20an%20Online%20Consultation.', '_blank');
    });

    document.getElementById('btnScrollToEntry').addEventListener('click', () => {
        document.getElementById('prescriptionEntrySection').scrollIntoView({ behavior: 'smooth' });
    });

    startHealthTipsRotation();
    setupTabs();
});

// Auto rotating health tips banner logic
function startHealthTipsRotation() {
    let index = 0;
    setInterval(() => {
        index = (index + 1) % healthTips.length;
        document.getElementById('tipTitle').innerText = healthTips[index].title;
        document.getElementById('tipContent').innerText = healthTips[index].content;
    }, 6000);
}

// Password Only Login Handler
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if(!password) return alert('অনুগ্ৰহ কৰি পাছৱৰ্ডটো লিখক।');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert('ভুল পাছৱৰ্ড! আকৌ চেষ্টা কৰক।');
    else showDashboard();
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('publicBookingSection').classList.add('hidden');
    document.getElementById('appDashboard').classList.remove('hidden');
    loadPatients();
    loadBookings();
    loadExpenses();
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    location.reload();
}

function showBookingForm() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('publicBookingSection').classList.remove('hidden');
}

// ==================== PATIENT LOGIC ====================
async function loadPatients() {
    const { data, error } = await supabaseClient.from('clinic_data').select('*').order('created_at', { ascending: false });
    if (error) return;
    const container = document.getElementById('listPatients');
    container.innerHTML = '';
    data.forEach(p => container.appendChild(createPatientCard(p)));
}

function createPatientCard(p) {
    const card = document.createElement('div');
    card.className = 'bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4';
    
    const info = document.createElement('div');
    info.innerHTML = `<h4 class="text-base font-bold text-slate-900">${escapeHTML(p.name)} <span class="text-xs font-normal text-gray-500">(${escapeHTML(p.age || 'N/A')})</span></h4>
                      <p class="text-xs text-gray-600 mt-0.5">📞 ${escapeHTML(p.phone)} | 🩺 BP: ${escapeHTML(p.bp || 'N/A')}</p>
                      <p class="text-xs text-gray-500 mt-1"><b>History:</b> ${escapeHTML(p.history || 'None')}</p>`;
    
    const actions = document.createElement('div');
    actions.className = 'flex gap-2';

    const btnPrint = document.createElement('button');
    btnPrint.className = 'bg-gray-800 text-white px-3 py-2 rounded-lg text-xs font-bold';
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

    const btnDelete = document.createElement('button');
    btnDelete.className = 'bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold';
    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
    btnDelete.onclick = () => deletePatientRecord(p.id);

    actions.append(btnPrint, btnWA, btnEdit, btnDelete);
    card.append(info, actions);
    return card;
}

async function savePatientRecord() {
    const name = document.getElementById('pName').value;
    if(!name) return alert('ৰোগীৰ নাম লিখাটো বাধ্যতামূলক।');

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
        alert('প্ৰেচক্ৰিপচন সফলতাৰে আপডেট হ’ল।');
    } else {
        await supabaseClient.from('clinic_data').insert([patientData]);
        alert('নতুন ৰোগীৰ তথ্য সংৰক্ষণ কৰা হ’ল।');
    }
    currentEditId = null;
    document.getElementById('formTitle').innerText = 'নতুন ৰোগীৰ প্ৰেচক্ৰিপচন এণ্ট্ৰী চেকচন';
    clearForm();
    loadPatients();
}

function loadPatientToForm(p) {
    currentEditId = p.id;
    document.getElementById('formTitle').innerText = `এডিট মোড: ${p.name}`;
    document.getElementById('pName').value = p.name;
    document.getElementById('pAgeSex').value = p.age || '';
    document.getElementById('pBP').value = p.bp || '';
    document.getElementById('pPhone').value = p.phone || '';
    document.getElementById('pHistory').value = p.history || '';
    document.getElementById('pMedicine').value = p.medicine || '';
    document.getElementById('pFees').value = p.fees || 0;
    document.getElementById('prescriptionEntrySection').scrollIntoView({ behavior: 'smooth' });
}

async function deletePatientRecord(id) {
    if (confirm('আপুনি সঁচাকৈয়ে এই ৰোগীৰ তথ্য মচিব বিচাৰে?')) {
        await supabaseClient.from('clinic_data').delete().eq('id', id);
        loadPatients();
    }
}

// ==================== EXPENSE LOGIC ====================
async function saveExpenseRecord() {
    const category = document.getElementById('expCategory').value;
    const amount = parseFloat(document.getElementById('expAmount').value);
    const description = document.getElementById('expDesc').value;

    if (!amount || amount <= 0) return alert('সঠিক খৰচৰ পৰিমাণ লিখক।');

    const { error } = await supabaseClient.from('clinic_expenses').insert([{ category, amount, description }]);
    if (error) alert('খৰচ সংৰক্ষণ ব্যৰ্থ হৈছে।');
    else {
        alert('খৰচৰ হিচাপ সংৰক্ষণ কৰা হ’ল।');
        document.getElementById('expAmount').value = '';
        document.getElementById('expDesc').value = '';
        loadExpenses();
    }
}

async function loadExpenses() {
    const { data, error } = await supabaseClient.from('clinic_expenses').select('*').order('created_at', { ascending: false });
    if (error || !data) return;

    const container = document.getElementById('listExpenses');
    container.innerHTML = '';

    let summary = { Salary: 0, Rent: 0, 'Electricity Bill': 0, 'Miscellaneous Expenses': 0 };
    let totalExpense = 0;

    data.forEach(e => {
        if (summary[e.category] !== undefined) summary[e.category] += parseFloat(e.amount);
        totalExpense += parseFloat(e.amount);

        const card = document.createElement('div');
        card.className = 'p-3 bg-white border border-gray-100 rounded-xl flex justify-between items-center text-xs shadow-sm';
        card.innerHTML = `<div>
                            <span class="font-bold text-red-700">[${escapeHTML(e.category)}]</span> 
                            <p class="text-gray-500 mt-0.5">${escapeHTML(e.description || 'No details')}</p>
                          </div>
                          <div class="flex items-center gap-3">
                            <span class="font-bold text-gray-900">₹${e.amount}</span>
                            <button class="text-red-400 hover:text-red-600" onclick="deleteExpenseRecord('${e.id}')"><i class="fas fa-trash"></i></button>
                          </div>`;
        container.appendChild(card);
    });

    document.getElementById('expenseSummaryText').innerHTML = `
        • দৰমহা (Salary): ₹${summary['Salary']}<br>
        • ঘৰ ভাড়া (Rent): ₹${summary['Rent']}<br>
        • বিজুলী বিল (Electricity): ₹${summary['Electricity Bill']}<br>
        • অন্যান্য খৰচ (Misc): ₹${summary['Miscellaneous Expenses']}<br>
        <hr class="my-1 border-red-100">
        <b class="text-xs text-red-900">📊 সৰ্বমুঠ খৰচ: ₹${totalExpense}</b>
    `;
}

async function deleteExpenseRecord(id) {
    if (confirm('খৰচৰ ৰেকৰ্ড ডিলিট কৰিব বিচাৰে?')) {
        await supabaseClient.from('clinic_expenses').delete().eq('id', id);
        loadExpenses();
    }
}

// ==================== BOOKING LOGIC ====================
async function submitBooking() {
    const name = document.getElementById('bName').value;
    const phone = document.getElementById('bPhone').value;
    const txn_id = document.getElementById('bTxnId').value;
    const problem = document.getElementById('bProblem').value;

    if(!name || !phone || !txn_id) return alert('অনুগ্ৰহ কৰি প্ৰয়োজনীয় অংশসমূহ পূৰণ কৰক।');

    const { error } = await supabaseClient.from('clinic_bookings').insert([{ name, phone, txn_id, problem }]);
    if (error) alert('বুকিং কৰিব পৰা নগ’ল।');
    else {
        alert('বুকিং অনুৰোধ গ্ৰহণ কৰা হৈছে।');
        const flashMsg = `🏥 *DR. HARIS CLINIC*\n\nনমস্কাৰ ${name},\nআপোনাৰ অনলাইন বুকিং অনুৰোধটি লাভ কৰিছোঁ।\nTxn ID: ${txn_id}`;
        window.open(`https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(flashMsg)}`, '_blank');
        location.reload();
    }
}

async function loadBookings() {
    const { data, error } = await supabaseClient.from('clinic_bookings').select('*').order('created_at', { ascending: false });
    if(error) return;
    const container = document.getElementById('listBookings');
    container.innerHTML = data.map(b => `
        <div class="p-4 border rounded-xl bg-gray-50 flex justify-between items-center shadow-sm text-xs">
            <div>
                <h5 class="font-bold text-gray-900">${escapeHTML(b.name)} (${escapeHTML(b.phone)})</h5>
                <p class="text-red-600 font-mono mt-0.5">Txn ID: ${escapeHTML(b.txn_id)}</p>
                <p class="text-gray-600 mt-1">${escapeHTML(b.problem || 'No description')}</p>
            </div>
            <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">Pending</span>
        </div>
    `).join('');
}

function sendWhatsAppRx(p) {
    if(!p.phone) return alert('মোবাইল নম্বৰ পোৱা নগ’ল।');
    const msg = `🏥 *DR. HARIS HOMEOPATHIC CLINIC*\n\n*Patient:* ${p.name}\n\n*Rx:*\n${p.medicine}`;
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
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('text-slate-900', 'border-b-2', 'border-slate-900'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.add('text-gray-400'));
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-slate-900', 'border-b-2', 'border-slate-900');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
        });
    });
}
