// seller.js
document.addEventListener('DOMContentLoaded', function() {
    // Elemen Form
    const signupSection = document.getElementById('signup-section');
    const loginSection = document.getElementById('login-section');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const showLoginLink = document.getElementById('show-login-link');
    const showSignupLink = document.getElementById('show-signup-link');

    // Elemen Dashboard
    const dashboardSection = document.getElementById('dashboard-section');
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
    // Elemen baru untuk tombol Buka/Tutup
    const toggleStatusBtn = document.getElementById('toggle-status-btn');

    // Input Form
    const signupNameInput = document.getElementById('signup-name');
    const signupPinInput = document.getElementById('signup-pin');
    const loginNameInput = document.getElementById('login-name');
    const loginPinInput = document.getElementById('login-pin');

    let currentSellerId = null;
    let currentSellerName = null;
    let currentSellerStatus = 'aktif'; // Default status saat login

    // Cek session di localStorage saat halaman dimuat
    // Jika ada nama di localStorage, tampilkan dashboard langsung
    const savedName = localStorage.getItem('warling_seller_name');
    if (savedName) {
        // Secara opsional, bisa tetap menampilkan form login dan mengisi otomatis
        // loginNameInput.value = savedName;
        // Atau, langsung tampilkan dashboard jika yakin session valid
        // Untuk sekarang, kita coba login otomatis ke dashboard jika nama ada
        // Kita gunakan fungsi login dengan nama dari localStorage
        // Namun, ini tidak validasi PIN. Lebih baik tetap login manual.
        // Jadi, kita biarkan form login muncul, tapi isi nama otomatis.
        loginNameInput.value = savedName; // Isi otomatis nama di form login
        loginSection.classList.remove('hidden'); // Tampilkan form login
        signupSection.classList.add('hidden'); // Sembunyikan form signup
    } else {
        signupSection.classList.remove('hidden'); // Tampilkan form signup jika tidak ada session
        loginSection.classList.add('hidden'); // Sembunyikan form login
    }

    // Fungsi untuk beralih antar form
    showLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        loginSection.classList.remove('hidden');
        signupSection.classList.add('hidden');
    });

    showSignupLink.addEventListener('click', function(e) {
        e.preventDefault();
        signupSection.classList.remove('hidden');
        loginSection.classList.add('hidden');
    });

    // Submit form pendaftaran
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = signupNameInput.value.trim();
        const pin = signupPinInput.value.trim();

        if (!name || !pin) {
            alert('Nama Usaha dan PIN harus diisi.');
            return;
        }

        try {
            const { data: rpcResult, error } = await supabase.rpc('signup_seller', { shop_name: name, plain_pin: pin });
            if (error) throw error;

            // Penanganan hasil RPC signup
            if (rpcResult && rpcResult.error) {
                throw new Error(rpcResult.error);
            }

            if (rpcResult && rpcResult.id) {
                alert('Pendaftaran berhasil!');
                // Reset form
                signupForm.reset();
                // Login otomatis atau arahkan ke form login
                loginNameInput.value = name; // Isi nama di form login
                loginPinInput.value = pin; // Isi PIN di form login (INGAT: Ini tidak aman secara praktik umum, hanya untuk kemudahan dalam kasus ini)
                // Beralih ke form login
                signupSection.classList.add('hidden');
                loginSection.classList.remove('hidden');
                // Fokus ke PIN agar pengguna bisa langsung submit
                loginPinInput.focus();
                // Atau, langsung coba login otomatis (opsional)
                // loginForm.dispatchEvent(new Event('submit')); // Ini akan memicu submit login
            } else {
                throw new Error('Data penjual tidak valid setelah pendaftaran.');
            }

        } catch (error) {
            console.error('Signup error:', error);
            alert('Gagal mendaftar: ' + error.message);
        }
    });

    // Submit form login
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = loginNameInput.value.trim();
        const pin = loginPinInput.value.trim();

        if (!name || !pin) {
            alert('Nama Usaha dan PIN harus diisi.');
            return;
        }

        try {
            const { data: rpcResult, error } = await supabase.rpc('check_pin', { seller_name: name, plain_pin: pin });
            if (error) throw error;

            // Penanganan hasil RPC login
            if (rpcResult && rpcResult.error) {
                throw new Error(rpcResult.error);
            }

            if (rpcResult && rpcResult.id) {
                currentSellerId = rpcResult.id;
                currentSellerName = rpcResult.name;
                currentSellerStatus = rpcResult.status; // Ambil status saat login

                // Simpan HANYA nama di localStorage
                localStorage.setItem('warling_seller_name', currentSellerName);

                // Sembunyikan form, tampilkan dashboard
                signupSection.classList.add('hidden');
                loginSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');

                // Isi form profil dengan data awal
                profileNameInput.value = currentSellerName;
                profileDescInput.value = rpcResult.description || '';
                profilePhoneInput.value = rpcResult.phone_number || '';
                profileTypeSelect.value = rpcResult.seller_type || 'Makanan';
                profileMessageInput.value = rpcResult.broadcast_message || '';

                // Update tampilan tombol status
                updateStatusDisplay(currentSellerStatus);

                // Load produk
                loadProducts(currentSellerId);
            } else {
                throw new Error('Data penjual tidak valid atau tidak ditemukan saat login.');
            }

        } catch (error) {
            console.error('Login error:', error);
            alert('Gagal masuk: ' + error.message);
        }
    });

    // Fungsi untuk mengupdate status (Buka/Tutup)
    async function updateStatus(newStatus) {
        if (!currentSellerId) return;

        try {
            const { error } = await supabase
                .from('sellers')
                .update({ status: newStatus })
                .eq('id', currentSellerId);

            if (error) throw error;

            currentSellerStatus = newStatus;
            updateStatusDisplay(currentSellerStatus);
            alert(`Status toko diubah menjadi: ${newStatus === 'aktif' ? 'Buka' : 'Tutup'}`);
            // last_updated_at otomatis diupdate oleh Supabase trigger/function

        } catch (error) {
            console.error('Update status error:', error);
            alert('Gagal memperbarui status: ' + error.message);
        }
    }

    // Fungsi untuk memperbarui tampilan tombol status
    function updateStatusDisplay(status) {
        if (status === 'aktif') {
            toggleStatusBtn.textContent = 'Tutup Toko';
            toggleStatusBtn.classList.remove('btn-success'); // Opsional: ubah warna
            toggleStatusBtn.classList.add('btn-error'); // Opsional: ke merah
        } else {
            toggleStatusBtn.textContent = 'Buka Toko';
            toggleStatusBtn.classList.remove('btn-error'); // Opsional: ubah warna
            toggleStatusBtn.classList.add('btn-success'); // Opsional: ke hijau
        }
    }

    // Event listener untuk tombol Buka/Tutup
    toggleStatusBtn.addEventListener('click', function() {
        if (currentSellerStatus === 'aktif') {
            updateStatus('nonaktif');
        } else {
            updateStatus('aktif');
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
            const { products, error } = await supabase
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
        currentSellerStatus = 'aktif'; // Reset status lokal
        // Hanya hapus nama, bukan PIN (karena tidak disimpan)
        localStorage.removeItem('warling_seller_name');
        // Reset form dan tampilkan form login
        loginForm.reset();
        signupSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        // Isi otomatis nama dari localStorage jika ada (untuk pengalaman lanjutan)
        const savedName = localStorage.getItem('warling_seller_name');
        if (savedName) {
            loginNameInput.value = savedName;
        }
    });
});