// ==========================================
// PROSHIP LOGISTICS - PUBLIC SCRIPT (v10 Modular)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    // 1. Attach listener to Hero Tracking Form
    const heroForm = document.getElementById('heroTrackForm');
    if (heroForm) {
        heroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('heroTrackInput').value;
            handleTrackingSearch(code);
        });
    }

    // 2. Attach listener to Main Tracking Form
    const mainForm = document.getElementById('mainTrackForm');
    if (mainForm) {
        mainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('mainTrackInput').value;
            handleTrackingSearch(code);
        });
    }

    // 3. Attach Print Button Listener
    const printBtn = document.getElementById('printReceiptBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
});

async function handleTrackingSearch(rawCode) {
    const resultContainer = document.getElementById('trackingResult');
    if (!resultContainer) return;

    let trackingInput = rawCode ? rawCode.trim().toUpperCase() : '';
    if (!trackingInput) return;

    // Scroll to tracking section
    const trackingSection = document.getElementById('tracking');
    if (trackingSection) trackingSection.scrollIntoView({ behavior: 'smooth' });

    try {
        const q = query(
            collection(db, 'shipments'), 
            where('trackingCode', '==', trackingInput)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert(`No shipment record found for tracking ID: ${trackingInput}`);
            return;
        }

        // Unhide result container
        resultContainer.classList.remove('hidden');

        querySnapshot.forEach((doc) => {
            renderShipmentData(doc.data());
        });

    } catch (error) {
        console.error("Tracking Search Error:", error);
        alert("Error fetching shipment record: " + error.message);
    }
}

function renderShipmentData(data) {
    // Header & Status
    document.getElementById('resTrackingId').textContent = data.trackingCode || 'N/A';
    
    const statusBadge = document.getElementById('resStatusBadge');
    const currentStatus = data.status || 'Pending';
    statusBadge.textContent = currentStatus;

    // Sender Info
    document.getElementById('resSenderName').textContent = data.senderName || '--';
    document.getElementById('resSenderPhone').textContent = data.senderPhone || '--';
    document.getElementById('resSenderAddr').textContent = data.origin || '--';

    // Receiver Info
    document.getElementById('resReceiverName').textContent = data.receiverName || '--';
    document.getElementById('resReceiverPhone').textContent = data.receiverPhone || '--';
    document.getElementById('resReceiverAddr').textContent = data.destination || '--';

    // Transit Info
    document.getElementById('resOrigin').textContent = data.origin || '--';
    document.getElementById('resDestination').textContent = data.destination || '--';
    document.getElementById('resCurrentLoc').textContent = data.currentLocation || '--';
    document.getElementById('resEstDelivery').textContent = data.estDelivery || '--';

    // Photo Handling
    const photoContainer = document.getElementById('photoContainer');
    const photoImg = document.getElementById('resShipmentPhoto');
    if (data.photoUrl) {
        photoImg.src = data.photoUrl;
        photoContainer.classList.remove('hidden');
    } else {
        photoContainer.classList.add('hidden');
    }

    // Notes Handling
    const notesContainer = document.getElementById('notesContainer');
    const adminNotes = document.getElementById('resAdminNotes');
    if (data.notes) {
        adminNotes.textContent = data.notes;
        notesContainer.classList.remove('hidden');
    } else {
        notesContainer.classList.add('hidden');
    }

    // Progress Bar Calculation
    updateProgressBar(currentStatus);
}

function updateProgressBar(status) {
    const progressBar = document.getElementById('resProgressBar');
    const stepRegistered = document.getElementById('step-registered');
    const stepTransit = document.getElementById('step-transit');
    const stepOut = document.getElementById('step-outfordelivery');
    const stepDelivered = document.getElementById('step-delivered');

    // Reset step classes
    [stepRegistered, stepTransit, stepOut, stepDelivered].forEach(step => {
        if (step) step.className = 'step';
    });

    const statusLower = status.toLowerCase();

    if (statusLower.includes('deliver')) {
        if (progressBar) progressBar.style.width = '100%';
        if (stepRegistered) stepRegistered.classList.add('step-completed');
        if (stepTransit) stepTransit.classList.add('step-completed');
        if (stepOut) stepOut.classList.add('step-completed');
        if (stepDelivered) stepDelivered.classList.add('step-completed');
    } else if (statusLower.includes('out')) {
        if (progressBar) progressBar.style.width = '75%';
        if (stepRegistered) stepRegistered.classList.add('step-completed');
        if (stepTransit) stepTransit.classList.add('step-completed');
        if (stepOut) stepOut.classList.add('step-completed');
    } else if (statusLower.includes('transit')) {
        if (progressBar) progressBar.style.width = '50%';
        if (stepRegistered) stepRegistered.classList.add('step-completed');
        if (stepTransit) stepTransit.classList.add('step-completed');
    } else {
        // Pending / Registered
        if (progressBar) progressBar.style.width = '25%';
        if (stepRegistered) stepRegistered.classList.add('step-completed');
    }
}