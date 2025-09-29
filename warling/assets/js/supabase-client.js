// supabase-client.js
// Gantilah URL dan ANON_KEY dengan URL dan ANON KEY dari proyek Supabase Anda
const SUPABASE_URL = 'https://jtxhmzuyhsixggexmvbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eGhtenV5aHNpeGdnZXhtdmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzQ5ODYsImV4cCI6MjA3NDcxMDk4Nn0.iIutSz3vvsMN0VNg9lVlQqC-gOW9re9Jk9xczVpahnY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fungsi untuk menghitung jarak antara dua titik (lat/lng) dalam km
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi dalam km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Jarak dalam km
}