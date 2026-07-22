// ==========================================
// PROSHIP LOGISTICS - PUBLIC SCRIPT
// ==========================================

// --- FIREBASE CONFIGURATION ---
// REPLACE WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- DOM INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTrackingForms();
    initStarRatingSelect();
    initReviewsSystem();
});

// --- NAVIGATION & MOBILE MENU ---
function initNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });

        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }
}

// --- TRACKING ENGINE ---
function initTrackingForms() {
    const heroForm = document.getElementById('heroTrackForm');
    const mainForm = document.getElementById('mainTrackForm');

    if (heroForm) {
        heroForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = document.getElementById('heroTrackInput').value.trim().toUpperCase();
            if (val) executeTracking(val);
        });
    }

    if (mainForm) {
        mainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = document.getElementById('mainTrackInput').value.trim().toUpperCase();
            if (val) executeTracking(val);
        });
    }

    // Auto-search if URL query has ?track=CODE
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('track');
    if (codeFromUrl) {
        executeTracking(codeFromUrl.toUpperCase());
    }

    // Print Button Attachment
    const printBtn = document.getElementById('printReceiptBtn');
    if(printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
}

async function executeTracking(trackingCode) {
    const resultCard = document.getElementById('tracking-result') || document.getElementById('trackingResult');
    
    try {
        const querySnapshot = await db.collection('shipments').where('trackingCode', '==', trackingCode).get();

        if (querySnapshot.empty) {
            alert(`No shipment found with tracking number: ${trackingCode}`);
            return;
        }

        const data = querySnapshot.docs[0].data();
        renderTrackingDetails(data);

        if (resultCard) {
            resultCard.classList.remove('hidden');
            resultCard.scrollIntoView({ behavior: 'smooth' });
        }

    } catch (error) {
        console.error("Tracking Error: ", error);
        alert("Error retrieving shipment details. Please try again.");
    }
}

function renderTrackingDetails(data) {
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '--';
    };

    setTxt('resTrackingId', data.trackingCode);
    setTxt('resSenderName', data.senderName);
    setTxt('resSenderPhone', data.senderPhone);
    setTxt('resSenderAddr', data.senderAddress);
    setTxt('resReceiverName', data.receiverName);
    setTxt('resReceiverPhone', data.receiverPhone);
    setTxt('resReceiverAddr', data.receiverAddress);
    setTxt('resOrigin', data.origin);
    setTxt('resDestination', data.destination);
    setTxt('resCurrentLoc', data.currentLocation);
    setTxt('resEstDelivery', data.estDelivery);

    // Update Status Badge & Progress Bar
    const badge = document.getElementById('resStatusBadge');
    const progressBar = document.getElementById('resProgressBar');
    const status = data.status || 'Registered';

    if (badge) {
        badge.textContent = status;
        badge.className = 'status-badge';
        if (status === 'Delivered') badge.classList.add('status-delivered');
        else if (status === 'In Transit' || status === 'Out for Delivery') badge.classList.add('status-transit');
        else badge.classList.add('status-pending');
    }

    if (progressBar) {
        let width = '25%';
        if (status === 'In Transit') width = '50%';
        else if (status === 'Out for Delivery') width = '75%';
        else if (status === 'Delivered') width = '100%';
        progressBar.style.width = width;
    }

    // Photo Box
    const photoContainer = document.getElementById('photoContainer');
    const photoImg = document.getElementById('resShipmentPhoto');
    if (data.photoUrl) {
        photoImg.src = data.photoUrl;
        photoContainer.classList.remove('hidden');
    } else if (photoContainer) {
        photoContainer.classList.add('hidden');
    }

    // Admin Notes
    const notesContainer = document.getElementById('notesContainer');
    if (data.notes) {
        setTxt('resAdminNotes', data.notes);
        notesContainer.classList.remove('hidden');
    } else if (notesContainer) {
        notesContainer.classList.add('hidden');
    }
}

// --- RATINGS AND REVIEWS ---
let selectedStarValue = 0;

function initStarRatingSelect() {
    const stars = document.querySelectorAll('#starSelect i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedStarValue = parseInt(star.getAttribute('data-value'));
            updateStarUI(selectedStarValue);
        });
    });
}

function updateStarUI(val) {
    const stars = document.querySelectorAll('#starSelect i');
    stars.forEach((star, index) => {
        if (index < val) {
            star.className = 'fa-solid fa-star active';
        } else {
            star.className = 'fa-regular fa-star';
        }
    });
}

function initReviewsSystem() {
    const reviewForm = document.getElementById('reviewForm');
    
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reviewerName').value.trim();
            const comment = document.getElementById('reviewerComment').value.trim();

            if (selectedStarValue === 0) {
                alert("Please select a star rating!");
                return;
            }

            try {
                await db.collection('reviews').add({
                    name,
                    rating: selectedStarValue,
                    comment,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                reviewForm.reset();
                selectedStarValue = 0;
                updateStarUI(0);
                alert("Thank you! Your review has been published.");
                loadReviews();
            } catch (err) {
                console.error("Review Error: ", err);
            }
        });
    }

    loadReviews();
}

async function loadReviews() {
    const feed = document.getElementById('reviewsFeed');
    if (!feed) return;

    try {
        const snapshot = await db.collection('reviews').orderBy('timestamp', 'desc').get();
        feed.innerHTML = '';

        let totalScore = 0;
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            totalScore += data.rating;
            count++;

            const card = document.createElement('div');
            card.className = 'review-card';
            card.innerHTML = `
                <div style="display:flex; justify-between; align-items:center; margin-bottom: 8px;">
                    <strong>${data.name}</strong>
                    <span style="color:#f59e0b;">${'★'.repeat(data.rating)}</span>
                </div>
                <p style="font-size:0.9rem; color:#475569;">"${data.comment}"</p>
            `;
            feed.appendChild(card);
        });

        // Update Average Summary
        const avg = count > 0 ? (totalScore / count).toFixed(1) : "0.0";
        document.getElementById('avgRatingScore').textContent = avg;
        document.getElementById('totalReviewsCount').textContent = count;

    } catch (err) {
        console.error("Error loading reviews:", err);
    }
}