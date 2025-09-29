// main.js
document.addEventListener('DOMContentLoaded', function() {
    const welcomeView = document.getElementById('welcome-view');
    const buyerView = document.getElementById('buyer-view');
    const buyerBtn = document.getElementById('buyer-btn');
    const sellerBtn = document.getElementById('seller-btn');
    const backToWelcomeBtn = document.getElementById('back-to-welcome');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const distanceSlider = document.getElementById('distance-slider');
    const distanceValue = document.getElementById('distance-value');
    const mapElement = document.getElementById('map');
    const loadingOverlay = document.getElementById('loading-overlay');
    const shareQrBtn = document.getElementById('share-qr-btn');
    const qrModal = document.getElementById('qr-modal');

    let map = null;
    let markers = [];
    let userLocation = null;

    // Cek disclaimer
    if (!localStorage.getItem('disclaimerAccepted')) {
        showDisclaimer();
    }

    function showDisclaimer() {
        // Karena tidak ada modal bawaan pico.css untuk disclaimer wajib, kita gunakan alert sederhana
        // atau buat modal sederhana. Untuk sederhananya, gunakan alert dulu.
        // Alternatif: Buat div overlay dengan tombol setuju.
        const disclaimerOverlay = document.createElement('div');
        disclaimerOverlay.id = 'disclaimer-overlay';
        disclaimerOverlay.style.position = 'fixed';
        disclaimerOverlay.style.top = '0';
        disclaimerOverlay.style.left = '0';
        disclaimerOverlay.style.width = '100%';
        disclaimerOverlay.style.height = '100%';
        disclaimerOverlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
        disclaimerOverlay.style.display = 'flex';
        disclaimerOverlay.style.justifyContent = 'center';
        disclaimerOverlay.style.alignItems = 'center';
        disclaimerOverlay.style.zIndex = '9999';

        const disclaimerContent = document.createElement('div');
        disclaimerContent.className = 'card';
        disclaimerContent.style.maxWidth = '500px';
        disclaimerContent.innerHTML = `
            <article>
                <h3>Disclaimer</h3>
                <p>Gunakan aplikasi ini dengan bijak. Informasi lokasi penjual didasarkan pada data yang mereka berikan sendiri. Kami tidak bertanggung jawab atas akurasi atau keamanan transaksi.</p>
                <footer class="text-center">
                    <button id="accept-disclaimer" class="btn btn-primary">Saya Setuju</button>
                </footer>
            </article>
        `;

        disclaimerOverlay.appendChild(disclaimerContent);
        document.body.appendChild(disclaimerOverlay);

        document.getElementById('accept-disclaimer').addEventListener('click', function() {
            localStorage.setItem('disclaimerAccepted', 'true');
            document.body.removeChild(disclaimerOverlay);
        });
    }


    buyerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (!localStorage.getItem('disclaimerAccepted')) {
            alert('Anda harus menyetujui disclaimer terlebih dahulu.');
            return;
        }
        welcomeView.classList.add('hidden');
        buyerView.classList.remove('hidden');
        initializeMap();
        loadSellers();
    });

    sellerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = 'seller.html'; // Arahkan ke halaman penjual
    });

    backToWelcomeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        buyerView.classList.add('hidden');
        welcomeView.classList.remove('hidden');
        if (map) {
            map.remove(); // Hapus peta saat kembali
            map = null;
        }
    });

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        loadSellers();
    });

    distanceSlider.addEventListener('change', function() {
        distanceValue.textContent = this.value;
        loadSellers(); // Load ulang saat slider berubah
    });

    shareQrBtn.addEventListener('click', function() {
        qrModal.showModal();
        // Di sini nanti bisa diimplementasikan library QR Code untuk generate QR
        // Contoh placeholder: document.getElementById('qr-placeholder').innerHTML = '<img src="...generated_qr_data_url..." />';
    });

    function initializeMap() {
        if (!map) {
            map = L.map(mapElement).setView([-6.200000, 106.816666], 13); // Lokasi default Jakarta
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
    }

    function loadSellers() {
        showLoading(true);

        // Ambil lokasi pengguna dulu
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 15);

                fetchSellers(userLocation);
            },
            function(error) {
                console.error("Error mendapatkan lokasi: ", error);
                alert("Lokasi tidak dapat diakses. Peta akan menggunakan lokasi default.");
                userLocation = [-6.200000, 106.816666]; // Fallback ke Jakarta
                map.setView(userLocation, 13);
                fetchSellers(userLocation);
            }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    async function fetchSellers(userCoords) {
        try {
            const { data: sellers, error } = await supabase
                .from('sellers')
                .select('id, name, description, broadcast_message, phone_number, location, last_updated_at')
                .gte('last_updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 hari

            if (error) throw error;

            // Bersihkan marker lama
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];

            const searchTerm = searchInput.value.toLowerCase();
            const maxDistance = parseFloat(distanceSlider.value);

            sellers.forEach(seller => {
                if (seller.location) { // Pastikan lokasi ada
                    const sellerCoords = [seller.location.coordinates[1], seller.location.coordinates[0]]; // [lat, lng]
                    const distance = calculateDistance(userCoords[0], userCoords[1], sellerCoords[0], sellerCoords[1]);

                    // Filter berdasarkan jarak dan pencarian
                    if (distance <= maxDistance) {
                        const matchesSearch = !searchTerm ||
                            seller.name.toLowerCase().includes(searchTerm) ||
                            seller.description.toLowerCase().includes(searchTerm) ||
                            seller.broadcast_message.toLowerCase().includes(searchTerm);

                        if (matchesSearch) {
                            const marker = L.marker(sellerCoords).addTo(map);
                            marker.bindPopup(`
                                <b>${seller.name}</b><br>
                                ${seller.description}<br>
                                ${seller.broadcast_message}<br>
                                <a href="https://wa.me/${seller.phone_number}" target="_blank">Hubungi via WhatsApp</a>
                            `);
                            markers.push(marker);
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching sellers:', error);
            alert('Gagal memuat data penjual. Silakan coba lagi nanti.');
        } finally {
            showLoading(false);
        }
    }

    function showLoading(show) {
        if (show) {
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }

    // Inisialisasi awal jika langsung diakses sebagai pembeli (misalnya refresh halaman)
    if (!welcomeView.classList.contains('hidden')) {
        // Do nothing, welcome view is active
    }
});