// ==========================================
// PROSHIP LOGISTICS - ADMIN SCRIPT (v10 Modular)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD5Wwex6mXqaKspQUAfnuDWyiTf9Qtbwok",
    authDomain: "proshiplogistics-987cc.firebaseapp.com",
    databaseURL: "https://proshiplogistics-987cc-default-rtdb.firebaseio.com",
    projectId: "proshiplogistics-987cc",
    storageBucket: "proshiplogistics-987cc.firebasestorage.app",
    messagingSenderId: "390254122810",
    appId: "1:390254122810:web:716a6b7e3173bdcbc26203",
    measurementId: "G-LC481GRQYN"
};

// 2. Initialize Firebase, Auth, and Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- AUTHENTICATION LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        const loginScreen = document.getElementById('loginScreen');
        if (user) {
            if (loginScreen) loginScreen.classList.add('hidden');
            listenToAdminShipments(); // Connect real-time listener
        } else {
            if (loginScreen) loginScreen.classList.remove('hidden');
        }
    });

    initAdminEvents();
});

function initAdminEvents() {
    // Login Form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;

            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (err) {
                alert("Authentication Failed: " + err.message);
            }
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => signOut(auth));
    }

    // Modal Control
    const modal = document.getElementById('shipmentModal');
    const openModalBtn = document.getElementById('openCreateModalBtn');
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            document.getElementById('shipmentForm').reset();
            document.getElementById('editDocId').value = '';
            document.getElementById('modalTitle').textContent = 'Create New Shipment';
            modal.classList.remove('hidden');
        });
    }

    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // Form Submit (Create or Update)
    const shipmentForm = document.getElementById('shipmentForm');
    if (shipmentForm) {
        shipmentForm.addEventListener('submit', handleShipmentSave);
    }
}

// --- GENERATE RANDOM TRACKING CODE ---
function generateTrackingCode() {
    return 'PS-' + Math.floor(100000 + Math.random() * 900000);
}

// --- SAVE / UPDATE SHIPMENT ---
async function handleShipmentSave(e) {
    e.preventDefault();
    const docId = document.getElementById('editDocId').value;

    const shipmentData = {
        senderName: document.getElementById('sName').value,
        senderPhone: document.getElementById('sPhone').value,
        senderAddress: document.getElementById('sAddr').value,
        receiverName: document.getElementById('rName').value,
        receiverPhone: document.getElementById('rPhone').value,
        receiverAddress: document.getElementById('rAddr').value,
        origin: document.getElementById('origin').value,
        destination: document.getElementById('destination').value,
        currentLocation: document.getElementById('currentLoc').value,
        estDelivery: document.getElementById('estDelivery').value,
        status: document.getElementById('status').value,
        photoUrl: document.getElementById('photoUrl').value,
        notes: document.getElementById('adminNotes').value,
        updatedAt: serverTimestamp()
    };

    try {
        if (docId) {
            // Update Existing Record
            const docRef = doc(db, 'shipments', docId);
            await updateDoc(docRef, shipmentData);
            alert("Shipment updated successfully!");
        } else {
            // Create New Record
            shipmentData.trackingCode = generateTrackingCode();
            shipmentData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'shipments'), shipmentData);
            alert(`Shipment created successfully!\nTracking Code: ${shipmentData.trackingCode}`);
        }

        document.getElementById('shipmentModal').classList.add('hidden');
    } catch (err) {
        console.error("Save Error:", err);
        alert("Error saving record: " + err.message);
    }
}

// --- REAL-TIME SHIPMENT LISTENER ---
function listenToAdminShipments() {
    const tbody = document.getElementById('shipmentTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7">Loading live records...</td></tr>';

    // onSnapshot automatically updates whenever data changes in Firestore
    onSnapshot(collection(db, 'shipments'), (snapshot) => {
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7">No shipment records found.</td></tr>';
            return;
        }

        const docs = [];
        snapshot.forEach(docSnap => docs.push({ id: docSnap.id, ...docSnap.data() }));
        
        // Sort newest first
        docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docs.forEach(data => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${data.trackingCode || 'N/A'}</strong></td>
                <td>${data.senderName || ''}</td>
                <td>${data.receiverName || ''}</td>
                <td>${data.destination || ''}</td>
                <td><span class="status-badge">${data.status || ''}</span></td>
                <td>${data.estDelivery || ''}</td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px;" onclick="editShipment('${data.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-outline" style="padding:4px 8px; color:red; border-color:red;" onclick="deleteShipment('${data.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Live Stream Error:", error);
        tbody.innerHTML = '<tr><td colspan="7">Error loading live shipments. Check Firestore security rules.</td></tr>';
    });
}

// Global functions for table row actions
window.editShipment = async function(id) {
    try {
        const docRef = doc(db, 'shipments', id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        document.getElementById('editDocId').value = id;
        document.getElementById('sName').value = data.senderName || '';
        document.getElementById('sPhone').value = data.senderPhone || '';
        document.getElementById('sAddr').value = data.senderAddress || '';
        document.getElementById('rName').value = data.receiverName || '';
        document.getElementById('rPhone').value = data.receiverPhone || '';
        document.getElementById('rAddr').value = data.receiverAddress || '';
        document.getElementById('origin').value = data.origin || '';
        document.getElementById('destination').value = data.destination || '';
        document.getElementById('currentLoc').value = data.currentLocation || '';
        document.getElementById('estDelivery').value = data.estDelivery || '';
        document.getElementById('status').value = data.status || '';
        document.getElementById('photoUrl').value = data.photoUrl || '';
        document.getElementById('adminNotes').value = data.notes || '';

        document.getElementById('modalTitle').textContent = 'Edit Shipment ' + (data.trackingCode || '');
        document.getElementById('shipmentModal').classList.remove('hidden');
    } catch (err) {
        console.error("Error fetching record for edit:", err);
    }
};

window.deleteShipment = async function(id) {
    if (confirm("Permanently delete this shipment record?")) {
        try {
            await deleteDoc(doc(db, 'shipments', id));
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete shipment.");
        }
    }
};