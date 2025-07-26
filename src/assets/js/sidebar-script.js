// js/sidebar-script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elemen DOM Sidebar ---
    const sidebar = document.getElementById('sidebar');
    const mainSidebarToggleBtn = document.getElementById('mainSidebarToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

    // Fungsi untuk menginisialisasi status sidebar berdasarkan lebar layar
    function initializeSidebarState() {
        console.log('Initializing sidebar state...');
        if (window.innerWidth > 992) {
            // Desktop: Sidebar defaultnya ter-collapsed
            if (!sidebar.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
            }
            sidebar.classList.remove('active'); // Pastikan active class dihapus di desktop
            console.log('Sidebar initialized for desktop: collapsed');
        } else {
            // Mobile: Sidebar defaultnya tersembunyi
            sidebar.classList.remove('collapsed'); // Pastikan collapsed class dihapus di mobile
            sidebar.classList.remove('active'); // Pastikan sidebar tertutup saat muat
            console.log('Sidebar initialized for mobile: hidden');
        }
    }

    // Fungsi untuk mengaktifkan/menonaktifkan sidebar
    function toggleSidebar() {
        if (window.innerWidth > 992) {
            // Desktop behavior: toggle 'collapsed' class
            sidebar.classList.toggle('collapsed');
            console.log('Sidebar toggled (desktop). Current state:', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
        } else {
            // Mobile behavior: toggle 'active' class (slide in/out)
            sidebar.classList.toggle('active');
            console.log('Sidebar toggled (mobile). Current state:', sidebar.classList.contains('active') ? 'active' : 'inactive');
        }
    }

    // --- Event Listeners Sidebar ---

    // Tombol Hamburger di Header Utama (mobile only)
    if (mainSidebarToggleBtn) {
        mainSidebarToggleBtn.addEventListener('click', toggleSidebar);
        console.log('mainSidebarToggleBtn listener added');
    }

    // Tombol Tutup 'X' di dalam Sidebar (mobile & desktop)
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', toggleSidebar);
        console.log('sidebarCloseBtn listener added');
    }

    // Menutup sidebar jika klik di luar (hanya untuk mobile)
    document.addEventListener('click', (event) => {
        if (window.innerWidth <= 992) { // Hanya berlaku untuk mobile
            if (sidebar.classList.contains('active') &&
                !sidebar.contains(event.target) &&
                !mainSidebarToggleBtn.contains(event.target)) { // Pastikan klik bukan pada tombol toggle juga
                
                sidebar.classList.remove('active');
                console.log('Sidebar closed by outside click (mobile)');
            }
        }
        // Jika Anda ingin sidebar desktop otomatis collapse saat klik di luar (saat expanded),
        // tambahkan logika di sini. Saat ini, hanya tombol X yang men toggle di desktop.
        // else { // Desktop
        //     if (!sidebar.classList.contains('collapsed') && // Jika sidebar sedang expanded
        //         !sidebar.contains(event.target) &&
        //         (mainSidebarToggleBtn && !mainSidebarToggleBtn.contains(event.target)) // Cek mainSidebarToggleBtn jika ada dan bukan target
        //     ) {
        //         sidebar.classList.add('collapsed');
        //         console.log('Sidebar closed by outside click (desktop)');
        //     }
        // }
    });

    // Panggil saat halaman dimuat
    initializeSidebarState();

    // Debounce resize event for performance (dari common-script.js)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            initializeSidebarState();
            console.log('Window resized, sidebar state re-initialized.');
        }, 200); // Tunggu 200ms setelah resize selesai
    });
});