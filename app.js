// ১. Supabase Initialization
const SUPABASE_URL = 'https://oblvgjnyecvvnnnesegl.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_ekuwTZtgiCXsGRBWJXqYzQ_T8xUYjF9'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentEditId = null;
let currentUserRole = 'staff'; // ডিফল্ট ৰোল

window.addEventListener('DOMContentLoaded', () => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) checkUserRole(session.user);
    });

    document.getElementById('btnStaffLogin').addEventListener('click', handleLogin);
    document.getElementById('btnPatientBooking').addEventListener('click', showBookingForm);
    document.getElementById('btnSubmitBooking').addEventListener('click', submitBooking);
    document.getElementById('btnSavePatient').addEventListener('click', savePatientRecord);
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    document.getElementById('searchBox').addEventListener('keyup', filterPatients);
    
    // Auto-Scroll Feature
    document.getElementById('btnScrollToEntry').addEventListener('click', () => {
        document.getElementById('prescriptionEntrySection').scrollIntoView({ behavior: 'smooth' });
    });

    setupTabs();
});

// ৰোল চেক কৰা (Admin নে Staff)
async function checkUserRole(user) {
    const { data, error } = await supabaseClient.from('user_roles').select('role').eq('id', user.id).single();
    if (!error && data) {
        currentUserRole = data.role;
    } else {
        currentUserRole = 'staff'; 
    }
    document.getElementById('userBadge').innerText = currentUserRole.toUpperCase();
    showDashboard();
}

// সুৰক্ষিত লগইন
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if(!email || !password) return alert('ইমেইল আৰু পাছৱৰ্ড লিখক।');

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) alert('লগইন ব্যৰ্থ: ' + error.message);
    else checkUserRole(data.user);
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

// ==================== PATIENT MANAGEMENT ====================
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
    actions.className = 'flex flex-wrap gap-2 w-full md:w-auto';

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

    // কেৱল এডমিনে ডিলিট কৰিব পাৰিব
    if (currentUserRole === 'admin') {
        const btnDelete = document.createElement('button');
        btnDelete.className = 'bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold';
        btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
        btnDelete.onclick = () => deletePatientRecord(p.id);
        actions.append(btnDelete);
    }

    card.append(info, actions);
    return card;
}

async function savePatientRecord() {
    const name = document.getElementById('pName').value;
    if(!name) return alert('ৰোগীৰ নাম বাধ্যতামূলক।');

    const session = await supabaseClient.auth.getSession();
    const userId = session.data.session ? session.data.session.user.id : null;

    const patientData = {
        name,
        age: document.getElementById('pAgeSex').value,
        bp: document.getElementById('pBP').value,
        phone: document.getElementById('pPhone').value,
        history: document.getElementById('pHistory').value,
        medicine: document.getElementById('pMedicine').value,
        fees: parseInt(document.getElementById('pFees').value) || 0,
        created_by: userId
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

function loadPatientToForm(p) {
    // চাব-এডমিন সুৰক্ষা: চাব-এডমিনে কেৱল নিজৰ এন্ট্ৰি কৰা ৰোগীহে এডিট কৰিব পাৰিব
    if (currentUserRole !== 'admin') {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (p.created_by !== session.user.id) {
                alert('সুৰক্ষা উলংঘন: আপুনি কেৱল নিজৰ এন্ট্ৰি কৰা ৰেকৰ্ডহে এডিট কৰিব পাৰিব!');
                return;
            }
            proceedToForm(p);
        });
    } else {
        proceedToForm(p);
    }
}

function proceedToForm(p) {
    currentEditId = p.id;
    document.getElementById('formTitle').innerText = `এডিট: ${p.name}`;
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
    if (confirm('আপুনি সঁচাকৈয়ে এই ৰোগীৰ সমগ্ৰ তথ্য মচি পেলাব বিচাৰে?')) {
        await supabaseClient.from('clinic_data').delete().eq('id', id);
        loadPatients();
    }
}

// ==================== EXPENSE MANAGEMENT ====================
async function saveExpenseRecord() {
    const category = document.getElementById('expCategory').value;
    const amount = parseFloat(document.getElementById('expAmount').value);
    const description = document.getElementById('expDesc').value;

    if (!amount || amount <= 0) return alert('সঠিক টকাৰ পৰিমাণ লিখক।');

    const { error } = await supabaseClient.from('clinic_expenses').insert([{ category, amount, description }]);
    if (error) alert('খৰচ এন্ট্ৰি ব্যৰ্থ হৈছে।');
    else {
        alert('খৰচ সফলতাৰে সংৰক্ষণ হ’ল।');
        document.getElementById('expAmount').value = '';
        document.getElementById('expDesc').value = '';
        loadExpenses();
    }
}

async function loadExpenses() {
    const { data, error } = await supabaseClient.from('clinic_expenses').select('*').order('created_at', { ascending: false });
    if (error) return;

    const container = document.getElementById('listExpenses');
    container.innerHTML = '';

    let summary = { Salary: 0, Rent: 0, 'Electricity Bill': 0, 'Miscellaneous Expenses': 0 };
    let totalExpense = 0;

    data.forEach(e => {
        if (summary[e.category] !== undefined) summary[e.category] += parseFloat(e.amount);
        totalExpense += parseFloat(e.amount);

        const card = document.createElement('div');
        card.className = 'p-3 bg-white border border-gray-100 rounded-xl flex justify-between items-center text-sm shadow-sm';
        card.innerHTML = `<div>
                            <span class="font-bold text-red-700">[${escapeHTML(e.category)}]</span> 
                            <p class="text-xs text-gray-500 mt-0.5">${escapeHTML(e.description || 'No details')}</p>
                          </div>
                          <div class="flex items-center gap-3">
                            <span class="font-mono font-bold text-gray-900">₹${e.amount}</span>
                          </div>`;

        if (currentUserRole === 'admin') {
            const btnDelExp = document.createElement('button');
            btnDelExp.className = 'text-red-500 text-xs font-bold hover:text-red-700 ml-2';
            btnDelExp.innerHTML = '<i class="fas fa-trash"></i>';
            btnDelExp.onclick = () => deleteExpenseRecord(e.id);
            card.appendChild(btnDelExp);
        }
        container.appendChild(card);
    });

    // মাহেকীয়া প্ৰতিবেদন আপডেট (Monthly Summary Note)
    document.getElementById('expenseSummaryText').innerHTML = `
        • দৰমহা (Salary): ₹${summary['Salary']}<br>
        • ঘৰ ভাড়া (Rent): ₹${summary['Rent']}<br>
        • বিজুলী বিল (Electricity): ₹${summary['Electricity Bill']}<br>
        • অন্যান্য খৰচ (Misc): ₹${summary['Miscellaneous Expenses']}<br>
        <hr class="my-1 border-red-200">
        <b class="text-base text-red-900">📊 সৰ্বমুঠ মাসিক খৰচ: ₹${totalExpense}</b>
    `;
}

async function deleteExpenseRecord(id) {
    if (confirm('আপুনি সঁচাকৈয়ে এই খৰচৰ হিচাপ মচিব বিচাৰে?')) {
        await supabaseClient.from('clinic_expenses').delete().eq('id', id);
        loadExpenses();
    }
}

// ==================== BOOKING & WHATSAPP ====================
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
        // হোৱাটছএপ ফ্লেছ মেচেজ ট্ৰিগ কৰা
        const flashMsg = `🏥 *DR. HARIS CLINIC*\n\nনমস্কাৰ ${name},\nআপোনাৰ অনলাইন বুকিং অনুৰোধটি সফল হৈছে।\nTxn ID: ${txn_id}\n\nপ্ৰশাসকে অতি সোনকালে আপোনাক ভিজিটৰ সময় জনাই দিব। ধন্যবাদ।`;
        window.open(`https://api.whatsapp.com/send?phone=${phone.replace(/\D/g, '')}&text=${encodeURIComponent(flashMsg)}`, '_blank');
        location.reload();
    }
}

async function loadBookings() {
    const { data, error } = await supabaseClient.from('clinic_bookings').select('*').order('created_at', { ascending: false });
    if(error) return;
    const container = document.getElementById('listBookings');
    container.innerHTML = data.map(b => `
        <div class="p-4 border rounded-xl bg-gray-50 flex justify-between items-center shadow-sm">
            <div>
                <h5 class="font-bold text-gray-900">${escapeHTML(b.name)} (${escapeHTML(b.phone)})</h5>
                <p class="text-xs text-red-600 font-mono">Txn ID: ${escapeHTML(b.txn_id)} | 📅 ${new Date(b.created_at).toLocaleDateString('en-IN')}</p>
                <p class="text-sm text-gray-600 mt-1">${escapeHTML(b.problem || 'No description')}</p>
            </div>
            <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded font-bold">Pending</span>
        </div>
    `).join('');
}

function sendWhatsAppRx(p) {
    if(!p.phone) return alert('মোবাইল নম্বৰ নাই।');
    const msg = `🏥 *DR. HARIS HOMEOPATHIC CLINIC*\n📍 গোগামুখ, অসম\n\n*Patient:* ${p.name}\n*Age/Sex:* ${p.age || 'N/A'}\n\n*Rx:*\n${p.medicine}\n\n🌐 *Website:* https://drhariswellfuture.com/`;
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
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.add('text-gray-400'));
            
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-green-800', 'border-b-2', 'border-green-800');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
        });
    });
}
