// ==========================================
// PROSHIP LOGISTICS - ADMIN SCRIPT
// ==========================================

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// --- AUTHENTICATION LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        const loginScreen = document.getElementById('loginScreen');
        if (user) {
            loginScreen.classList.add('hidden');
            loadAdminShipments();
        } else {
            loginScreen.classList.remove('hidden');
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
                await auth.signInWithEmailAndPassword(email, pass);
            } catch (err) {
                alert("Authentication Failed: " + err.message);
            }
        });
    }

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

    // Modal Control
    const modal = document.getElementById('shipmentModal');
    document.getElementById('openCreateModalBtn').addEventListener('click', () => {
        document.getElementById('shipmentForm').reset();
        document.getElementById('editDocId').value = '';
        document.getElementById('modalTitle').textContent = 'Create New Shipment';
        modal.classList.remove('hidden');
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Form Submit (Create or Update)
    document.getElementById('shipmentForm').addEventListener('submit', handleShipmentSave);
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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (docId) {
            // Update Existing Record
            await db.collection('shipments').doc(docId).update(shipmentData);
            alert("Shipment updated successfully!");
        } else {
            // Create New Record
            shipmentData.trackingCode = generateTrackingCode();
            shipmentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('shipments').add(shipmentData);
            alert(`Shipment created successfully!\nTracking Code: ${shipmentData.trackingCode}`);
        }

        document.getElementById('shipmentModal').classList.add('hidden');
        loadAdminShipments();
    } catch (err) {
        console.error("Save Error:", err);
        alert("Error saving record: " + err.message);
    }
}

// --- RENDER SHIPMENT TABLE ---
async function loadAdminShipments() {
    const tbody = document.getElementById('shipmentTableBody');
    tbody.innerHTML = '<tr><td colspan="7">Loading records...</td></tr>';

    try {
        const snapshot = await db.collection('shipments').orderBy('createdAt', 'desc').get();
        tbody.innerHTML = '';

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7">No shipment records found.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td><strong>${data.trackingCode || 'N/A'}</strong></td>
                <td>${data.senderName}</td>
                <td>${data.receiverName}</td>
                <td>${data.destination}</td>
                <td><span class="status-badge">${data.status}</span></td>
                <td>${data.estDelivery}</td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px;" onclick="editShipment('${doc.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-outline" style="padding:4px 8px; color:red; border-color:red;" onclick="deleteShipment('${doc.id}')"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// Global functions for table row actions
window.editShipment = async function(id) {
    const doc = await db.collection('shipments').doc(id).get();
    if (!doc.exists) return;

    const data = doc.data();
    document.getElementById('editDocId').value = id;
    document.getElementById('sName').value = data.senderName;
    document.getElementById('sPhone').value = data.senderPhone;
    document.getElementById('sAddr').value = data.senderAddress;
    document.getElementById('rName').value = data.receiverName;
    document.getElementById('rPhone').value = data.receiverPhone;
    document.getElementById('rAddr').value = data.receiverAddress;
    document.getElementById('origin').value = data.origin;
    document.getElementById('destination').value = data.destination;
    document.getElementById('currentLoc').value = data.currentLocation;
    document.getElementById('estDelivery').value = data.estDelivery;
    document.getElementById('status').value = data.status;
    document.getElementById('photoUrl').value = data.photoUrl || '';
    document.getElementById('adminNotes').value = data.notes || '';

    document.getElementById('modalTitle').textContent = 'Edit Shipment ' + data.trackingCode;
    document.getElementById('shipmentModal').classList.remove('hidden');
};

window.deleteShipment = async function(id) {
    if (confirm("Permanently delete this shipment record?")) {
        await db.collection('shipments').doc(id).delete();
        loadAdminShipments();
    }
};