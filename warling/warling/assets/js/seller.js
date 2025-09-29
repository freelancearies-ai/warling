// seller.js
document.addEventListener('DOMContentLoaded', function() {
    const authSection = document.getElementById('auth-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const authNameInput = document.getElementById('auth-name');
    const authPinInput = document.getElementById('auth-pin');

    const profileForm = document.getElementById('profile-form');
    const profileNameInput = document.getElementById('profile-name');
    const profileDescInput = document.getElementById('profile-desc');
    const profilePhoneInput = document.getElementById('profile-phone');
    const profileTypeSelect = document.getElementById('profile-type');
    const profileMessageInput = document.getElementById('profile-message');

    const updateLocationBtn = document.getElementById('update-location-btn');
    const locationStatus = document.getElementById('location-status');

    const addProductForm = document.getElementById('add-product-form');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productsList = document.getElementById('products-list');

    const logoutBtn = document.getElementById('logout-btn');

    let currentSellerId = null;
    let currentSellerName = null;

    // Cek session di localStorage saat halaman dimuat
    const savedName = localStorage.getItem('warling_seller_name');
    if (savedName) {
        authNameInput.value = savedName; // Isi otomatis nama
    }

    // Toggle mode Sign Up / Login
    let isLoginMode = true;

    function toggleAuthMode() {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = 'Masuk';
            toggleAuthModeBtn.textContent = 'Belum Punya Akun? Daftar';
        } else {
            authTitle.textContent = 'Daftar';
            toggleAuthModeBtn.textContent = 'Sudah Punya Akun? Masuk';
        }
        authPinInput.value = ''; // Kosongkan PIN saat toggle
    }
    toggleAuthModeBtn.addEventListener('click', toggleAuthMode);

    // Submit form auth (Sign Up / Login)
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = authNameInput.value.trim();
        const pin = authPinInput.value.trim();

        if (!name || !pin) {
            alert('Nama Usaha dan PIN harus diisi.');
            return;
        }

        try {
            let rpcResult;
            if (isLoginMode) {
                // Gunakan 'data' sesuai Supabase JS v2
                const { data, error } = await supabase.rpc('check_pin', { seller_name: name, plain_pin: pin });
                if (error) throw error;
                rpcResult = data; // RPC mengembalikan objek tunggal, bukan array
            } else {
                // Gunakan 'data' sesuai Supabase JS v2
                const { data, error } = await supabase.rpc('signup_seller', { shop_name: name, plain_pin: pin });
                if (error) throw error;
                rpcResult = data; // RPC mengembalikan objek tunggal, bukan array
            }

            // Penanganan hasil RPC
            if (rpcResult && rpcResult.error) { // Periksa jika RPC mengembalikan error dalam data
                throw new Error(rpcResult.error);
            }

            if (rpcResult && rpcResult.id) { // Periksa keberadaan id di objek hasil
                currentSellerId = rpcResult.id;
                currentSellerName = rpcResult.name;

                // Simpan HANYA nama di localStorage
                localStorage.setItem('warling_seller_name', currentSellerName);

                // Sembunyikan auth, tampilkan dashboard
                authSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');

                // Isi form profil dengan data awal
                profileNameInput.value = currentSellerName;
                profileDescInput.value = rpcResult.description || '';
                profilePhoneInput.value = rpcResult.phone_number || '';
                profileTypeSelect.value = rpcResult.seller_type || 'Makanan';
                profileMessageInput.value = rpcResult.broadcast_message || '';

                // Load produk
                loadProducts(currentSellerId);
            } else {
                throw new Error('Data penjual tidak valid atau tidak ditemukan.');
            }

        } catch (error) {
            console.error('Auth error:', error);
            alert('Gagal: ' + error.message);
        }
    });

    // Simpan profil
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!currentSellerId) return;

        const updates = {
            description: profileDescInput.value,
            phone_number: profilePhoneInput.value,
            seller_type: profileTypeSelect.value,
            broadcast_message: profileMessageInput.value
        };

        try {
            const { error } = await supabase
                .from('sellers')
                .update(updates)
                .eq('id', currentSellerId);

            if (error) throw error;
            alert('Profil berhasil diperbarui.');
            // last_updated_at otomatis diupdate oleh Supabase trigger/function
        } catch (error) {
            console.error('Update profile error:', error);
            alert('Gagal memperbarui profil: ' + error.message);
        }
    });

    // Perbarui lokasi
    updateLocationBtn.addEventListener('click', async function() {
        if (!currentSellerId) return;

        navigator.geolocation.getCurrentPosition(
            async function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                try {
                    await supabase.rpc('update_seller_location_by_id', {
                        seller_id_to_update: currentSellerId,
                        new_lon: lng,
                        new_lat: lat
                    });
                    locationStatus.textContent = 'Lokasi diperbarui.';
                    setTimeout(() => locationStatus.textContent = '', 2000); // Clear status after 2s
                } catch (error) {
                    console.error('Update location error:', error);
                    alert('Gagal memperbarui lokasi: ' + error.message);
                }
            },
            function(error) {
                console.error("Error mendapatkan lokasi: ", error);
                alert('Gagal mendapatkan lokasi.');
            }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    });

    // Tambah produk
    addProductForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!currentSellerId) return;

        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);

        if (!name || isNaN(price) || price < 0) {
            alert('Nama dan harga produk harus valid.');
            return;
        }

        // Ambil jumlah produk sekarang
        const { count, error: countError } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('seller_id', currentSellerId);
        if (countError) {
            console.error('Count products error:', countError);
            alert('Gagal memeriksa jumlah produk: ' + countError.message);
            return;
        }
        if (count >= 10) {
            alert('Maksimal 10 produk per penjual.');
            return;
        }

        try {
            const { error } = await supabase
                .from('products')
                .insert([{ seller_id: currentSellerId, name: name, price: price }]);

            if (error) throw error;
            productNameInput.value = '';
            productPriceInput.value = '';
            loadProducts(currentSellerId); // Reload list
        } catch (error) {
            console.error('Add product error:', error);
            alert('Gagal menambah produk: ' + error.message);
        }
    });

    // Load produk
    async function loadProducts(sellerId) {
        if (!currentSellerId) {
            console.error("Seller ID tidak ditemukan, tidak bisa memuat produk.");
            return; // Hentikan eksekusi jika seller ID tidak valid
        }

        try {
            // Gunakan 'data' bukan 'products' sesuai Supabase JS v2
            const { data: products, error } = await supabase
                .from('products')
                .select('*')
                .eq('seller_id', sellerId);

            if (error) {
                console.error('Error fetching products:', error);
                alert('Gagal memuat produk: ' + error.message);
                return; // Hentikan eksekusi jika query gagal
            }

            // Pastikan 'products' adalah array sebelum menggunakan forEach
            if (!Array.isArray(products)) {
                console.error("Data produk bukan array:", products);
                productsList.innerHTML = '<li>Error: Data produk tidak valid.</li>';
                return;
            }

            productsList.innerHTML = ''; // Clear list
            products.forEach(product => { // Sekarang forEach aman
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${product.name} - Rp ${product.price.toLocaleString('id-ID')}</span>
                    <button class="delete-product-btn" data-id="${product.id}">Hapus</button>
                `;
                productsList.appendChild(li);
            });

            // Tambahkan event listener untuk tombol hapus *setelah* list diisi
            document.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const productId = this.getAttribute('data-id');
                    if (confirm('Yakin ingin menghapus produk ini?')) {
                        try {
                            const { error } = await supabase
                                .from('products')
                                .delete()
                                .eq('id', productId);

                            if (error) throw error;
                            loadProducts(currentSellerId); // Reload list setelah hapus
                        } catch (error) {
                            console.error('Delete product error:', error);
                            alert('Gagal menghapus produk: ' + error.message);
                        }
                    }
                });
            });

        } catch (error) {
            console.error('Load products error (outer):', error);
            alert('Gagal memuat produk: ' + error.message);
        }
    }

    // Logout
    logoutBtn.addEventListener('click', function() {
        currentSellerId = null;
        currentSellerName = null;
        // Hanya hapus nama, bukan PIN (karena tidak disimpan)
        localStorage.removeItem('warling_seller_name');
        // Reset form dan tampilkan auth
        authForm.reset();
        authSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        isLoginMode = true; // Kembali ke mode login
        authTitle.textContent = 'Masuk';
        toggleAuthModeBtn.textContent = 'Belum Punya Akun? Daftar';
    });
});