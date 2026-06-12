'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Wallet,
  LogOut,
  Plus,
  Search,
  ArrowUpDown,
  Check,
  X,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  Clock,
  UserCheck
} from 'lucide-react';

interface Debt {
  id: string;
  user_id: string;
  type: 'owed_to_me' | 'i_owe';
  counterpart_name: string;
  amount: number;
  note: string | null;
  due_date: string;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  // User state
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Debts state
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [statusFilter, setStatusFilter] = useState<'semua' | 'belum' | 'lunas'>('semua');
  const [typeFilter, setTypeFilter] = useState<'semua' | 'dihutang' | 'hutang'>('semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [viewMode, setViewMode] = useState<'list' | 'group'>('list'); // flat list vs group by person
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentDebtId, setCurrentDebtId] = useState<string | null>(null);

  // Form states
  const [formType, setFormType] = useState<'owed_to_me' | 'i_owe'>('owed_to_me');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch session & debts
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
      }
    }
    checkUser();
  }, [supabase]);

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter,
        search: searchTerm,
      });

      const res = await fetch(`/api/debts?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengambil data dari server.');
      }

      const data = await res.json();
      setDebts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDebts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDebts]);

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Delete transaction handler
  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini?')) return;

    try {
      const res = await fetch(`/api/debts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menghapus catatan.');
      }

      // Optimistic state update
      setDebts(prev => prev.filter(d => d.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  };

  // Toggle settled/lunas handler
  const handleToggleSettled = async (id: string, currentSettled: boolean) => {
    try {
      const res = await fetch(`/api/debts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settled: !currentSettled }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengubah status lunas.');
      }

      const updatedDebt = await res.json();
      
      // Update local state
      setDebts(prev => prev.map(d => d.id === id ? updatedDebt : d));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  };

  // Open modal for add
  const openAddModal = () => {
    setModalMode('add');
    setCurrentDebtId(null);
    setFormType('owed_to_me');
    setFormName('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const openEditModal = (debt: Debt) => {
    setModalMode('edit');
    setCurrentDebtId(debt.id);
    setFormType(debt.type);
    setFormName(debt.counterpart_name);
    setFormAmount(debt.amount.toString());
    setFormDate(debt.due_date);
    setFormNote(debt.note || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formName.trim()) {
      setFormError('Nama orang harus diisi.');
      return;
    }

    const amountNum = Number(formAmount);
    if (isNaN(amountNum) || amountNum <= 0 || !Number.isInteger(amountNum)) {
      setFormError('Jumlah uang harus berupa angka bulat positif.');
      return;
    }

    if (formNote.length > 200) {
      setFormError('Catatan tidak boleh melebihi 200 karakter.');
      return;
    }

    setFormSubmitting(true);

    try {
      const url = modalMode === 'add' ? '/api/debts' : `/api/debts/${currentDebtId}`;
      const method = modalMode === 'add' ? 'POST' : 'PATCH';
      
      const payload = {
        type: formType,
        counterpart_name: formName,
        amount: amountNum,
        due_date: formDate,
        note: formNote ? formNote : null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan transaksi.');
      }

      await fetchDebts(); // reload all
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Helper formats
  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    const dateZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = dateZero.getTime() - nowZero.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'hari ini';
    if (diffDays === -1) return 'kemarin';
    if (diffDays === 1) return 'besok';
    
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      if (absDays < 30) return `${absDays} hari lalu`;
      const months = Math.floor(absDays / 30);
      return `${months} bulan lalu`;
    } else {
      if (diffDays < 30) return `${diffDays} hari lagi`;
      const months = Math.floor(diffDays / 30);
      return `${months} hari lagi`;
    }
  };

  // Compute stats (for outstanding / unpaid debts only)
  const outstandingDebts = debts.filter(d => d.settled_at === null);
  
  const totalOwedToMe = outstandingDebts
    .filter(d => d.type === 'owed_to_me')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalIOwe = outstandingDebts
    .filter(d => d.type === 'i_owe')
    .reduce((sum, d) => sum + d.amount, 0);

  const netBalance = totalOwedToMe - totalIOwe;

  // Process sorting on flat list
  const sortedDebts = [...debts].sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
    if (sortBy === 'date_asc') return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    if (sortBy === 'amount_asc') return a.amount - b.amount;
    return 0;
  });

  // Process Group by Person
  // Group key: counterpart_name (case-insensitive or exact, let's do exact trimmed)
  const groups: Record<string, { name: string; items: Debt[]; net: number; count: number }> = {};
  debts.forEach(d => {
    const key = d.counterpart_name.trim();
    if (!groups[key]) {
      groups[key] = { name: d.counterpart_name, items: [], net: 0, count: 0 };
    }
    groups[key].items.push(d);
    
    // Calculate net for the person
    const isOwed = d.type === 'owed_to_me';
    // If settled, it doesn't affect active balance, but let's count only unpaid items for net
    if (d.settled_at === null) {
      groups[key].net += isOwed ? d.amount : -d.amount;
    }
    groups[key].count += 1;
  });

  const groupedList = Object.values(groups).sort((a, b) => b.items.length - a.items.length);

  const toggleGroupCollapse = (name: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-4 py-6 md:py-8">
      {/* Header Bar */}
      <header className="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl text-slate-950 shadow-md shadow-emerald-500/10">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Kasbon</h1>
            <p className="text-xs text-slate-400">Pencatat Keuangan Pribadi</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs text-slate-500">Masuk sebagai</p>
            <p className="text-sm font-medium text-slate-300">{userEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-slate-900 border border-slate-850 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl transition cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Summary Section (3 Cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Card 1: Owed to me */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Dihutang ke saya</p>
          <p className="text-3xl font-extrabold text-emerald-400 tracking-tight transition-transform duration-200">
            {formatRupiah(totalOwedToMe)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            Total piutang belum lunas
          </div>
        </div>

        {/* Card 2: I owe */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none group-hover:bg-rose-500/10 transition-colors" />
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Saya hutang</p>
          <p className="text-3xl font-extrabold text-rose-400 tracking-tight transition-transform duration-200">
            {formatRupiah(totalIOwe)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
            Total utang belum lunas
          </div>
        </div>

        {/* Card 3: Net */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-6 rounded-2xl relative overflow-hidden group shadow-lg">
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full pointer-events-none transition-colors ${netBalance > 0 ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : netBalance < 0 ? 'bg-rose-500/5 group-hover:bg-rose-500/10' : 'bg-slate-500/5'}`} />
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Net (Selisih)</p>
          <p className={`text-3xl font-extrabold tracking-tight transition-transform duration-200 ${netBalance > 0 ? 'text-emerald-400' : netBalance < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {netBalance > 0 ? '+' : ''}{formatRupiah(netBalance)}
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
            <TrendingUp className={`w-3.5 h-3.5 ${netBalance > 0 ? 'text-emerald-400' : netBalance < 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            {netBalance > 0 ? 'Saldo Anda positif' : netBalance < 0 ? 'Saldo Anda negatif' : 'Saldo Anda seimbang'}
          </div>
        </div>
      </section>

      {/* Bonus Component: Bar Chart comparing Owed vs I Owe */}
      {(totalOwedToMe > 0 || totalIOwe > 0) && (
        <section className="bg-slate-900/35 border border-slate-800 p-5 rounded-2xl mb-8 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            Perbandingan Utang vs Piutang
          </h3>
          <div className="space-y-4">
            {/* Chart Progress Bar */}
            <div className="w-full h-3.5 bg-slate-950 rounded-full flex overflow-hidden">
              <div
                style={{ width: `${(totalOwedToMe / (totalOwedToMe + totalIOwe)) * 100}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                title={`Piutang: ${formatRupiah(totalOwedToMe)}`}
              />
              <div
                style={{ width: `${(totalIOwe / (totalOwedToMe + totalIOwe)) * 100}%` }}
                className="bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-500"
                title={`Utang: ${formatRupiah(totalIOwe)}`}
              />
            </div>
            
            {/* Legend */}
            <div className="flex justify-between items-center text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                <span>Piutang ({Math.round((totalOwedToMe / (totalOwedToMe + totalIOwe)) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
                <span>Utang ({Math.round((totalIOwe / (totalOwedToMe + totalIOwe)) * 100)}%)</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Actions and Filter Toolbar */}
      <section className="bg-slate-900/40 border border-slate-800 p-4 rounded-2xl mb-6 flex flex-col gap-4">
        {/* Row 1: Search & New Record Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Cari berdasarkan nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-transparent text-sm text-slate-200 placeholder-slate-500"
            />
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-455 hover:to-teal-555 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/5 transition cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Catat Baru
          </button>
        </div>

        {/* Row 2: Filtering, Sorting, View Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'semua' | 'belum' | 'lunas')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-300"
              >
                <option value="semua">Semua Status</option>
                <option value="belum">Belum Lunas</option>
                <option value="lunas">Lunas</option>
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tipe</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'semua' | 'dihutang' | 'hutang')}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-300"
              >
                <option value="semua">Semua Tipe</option>
                <option value="dihutang">Dihutang ke saya</option>
                <option value="hutang">Saya hutang</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Urutan</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc')}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-300 appearance-none"
                >
                  <option value="date_desc">Tanggal Terbaru</option>
                  <option value="date_asc">Tanggal Terlama</option>
                  <option value="amount_desc">Jumlah Terbesar</option>
                  <option value="amount_asc">Jumlah Terkecil</option>
                </select>
                <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-500">
                  <ArrowUpDown className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* View Mode Switch (Flat vs Grouped) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block text-left sm:text-right">Tampilan</label>
            <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-xl flex items-center">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setViewMode('group')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${viewMode === 'group' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Per Orang
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {loading ? (
          /* Loading Skeletal state */
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-6 w-36 bg-slate-850 rounded" />
                  <div className="h-6 w-20 bg-slate-850 rounded" />
                </div>
                <div className="h-4 w-28 bg-slate-850 rounded" />
                <div className="flex gap-2 pt-2">
                  <div className="h-8 w-24 bg-slate-850 rounded" />
                  <div className="h-8 w-16 bg-slate-850 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/30 border border-rose-900/20 text-rose-400 rounded-2xl text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p className="font-semibold">Gagal memuat catatan keuangan</p>
            <p className="text-sm text-slate-400 max-w-md">{error}</p>
            <button
              onClick={fetchDebts}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : debts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-900/10 border border-slate-850/80 border-dashed rounded-2xl text-center">
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-500 mb-4">
              <UserCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-300 mb-1">Belum ada catatan</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">
              Mulai mencatat utang piutang Anda dengan menekan tombol &ldquo;Catat Baru&rdquo; di atas.
            </p>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Mulai Mencatat
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* Flat list layout */
          <div className="space-y-4">
            {sortedDebts.map(debt => {
              const isSettled = debt.settled_at !== null;
              const isOwed = debt.type === 'owed_to_me';
              return (
                <article
                  key={debt.id}
                  className={`bg-slate-900/40 backdrop-blur border rounded-2xl p-5 md:p-6 transition-all duration-200 hover:border-slate-700/80 ${isSettled ? 'border-slate-850 opacity-70' : 'border-slate-800'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Primary info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-bold text-slate-100 text-lg">{debt.counterpart_name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isOwed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                          {isOwed ? 'Dihutang ke saya' : 'Saya hutang'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${isSettled ? 'bg-slate-800 text-slate-400 border border-slate-750' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                          {isSettled ? (
                            <>
                              <Check className="w-3 h-3" />
                              Lunas
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              Belum Lunas
                            </>
                          )}
                        </span>
                      </div>
                      
                      {/* Amount and Relative Date */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className={`font-extrabold text-lg ${isSettled ? 'text-slate-400 line-through' : isOwed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatRupiah(debt.amount)}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatRelativeTime(debt.due_date)}
                        </span>
                      </div>

                      {/* Note */}
                      {debt.note && (
                        <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 flex items-start gap-1.5 max-w-2xl mt-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="italic break-words">{debt.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions panel */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => handleToggleSettled(debt.id, isSettled)}
                        className={`p-2 rounded-xl border flex items-center justify-center transition cursor-pointer ${isSettled ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400'}`}
                        title={isSettled ? 'Tandai belum lunas' : 'Tandai lunas'}
                      >
                        {isSettled ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        <span className="text-xs font-semibold px-1 sm:inline">
                          {isSettled ? 'Belum lunas' : 'Tandai lunas'}
                        </span>
                      </button>

                      <button
                        onClick={() => openEditModal(debt)}
                        className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteDebt(debt.id)}
                        className="p-2 bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* Grouped by Person layout */
          <div className="space-y-4">
            {groupedList.map(group => {
              const isCollapsed = collapsedGroups[group.name] ?? false;
              const hasNetOwed = group.net > 0;
              const hasNetOwing = group.net < 0;
              
              return (
                <div key={group.name} className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/25">
                  {/* Group Header */}
                  <div
                    onClick={() => toggleGroupCollapse(group.name)}
                    className="p-5 bg-slate-900/50 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100">{group.name}</h4>
                        <p className="text-xs text-slate-500">{group.count} transaksi total</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Net position with this person */}
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Saldo Net</p>
                        <p className={`font-extrabold ${hasNetOwed ? 'text-emerald-400' : hasNetOwing ? 'text-rose-400' : 'text-slate-400'}`}>
                          {group.net > 0 ? '+' : ''}{formatRupiah(group.net)}
                        </p>
                      </div>
                      
                      {isCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronUp className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>

                  {/* Group Items list */}
                  {!isCollapsed && (
                    <div className="border-t border-slate-850 p-4 space-y-3 bg-slate-950/20">
                      {group.items.map(debt => {
                        const isSettled = debt.settled_at !== null;
                        const isOwed = debt.type === 'owed_to_me';
                        return (
                          <div
                            key={debt.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border rounded-xl transition-all ${isSettled ? 'border-slate-900 opacity-60 bg-slate-900/10' : 'border-slate-850 bg-slate-900/30'}`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isOwed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {isOwed ? 'Dihutang ke saya' : 'Saya hutang'}
                                </span>
                                <span className={`text-[10px] font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded ${isSettled ? 'bg-slate-800 text-slate-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {isSettled ? 'Lunas' : 'Belum lunas'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className={`font-bold ${isSettled ? 'text-slate-400 line-through' : isOwed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatRupiah(debt.amount)}
                                </span>
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatRelativeTime(debt.due_date)}
                                </span>
                              </div>
                              {debt.note && (
                                <p className="text-xs text-slate-400 italic font-light max-w-xl break-words">
                                  &ldquo;{debt.note}&rdquo;
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <button
                                onClick={() => handleToggleSettled(debt.id, isSettled)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer flex items-center gap-1 ${isSettled ? 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300' : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400'}`}
                              >
                                {isSettled ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                {isSettled ? 'Belum lunas' : 'Lunas'}
                              </button>

                              <button
                                onClick={() => openEditModal(debt)}
                                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteDebt(debt.id)}
                                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 text-slate-400 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* CREATE & EDIT FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                {modalMode === 'add' ? 'Catat Transaksi Baru' : 'Ubah Transaksi'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tipe Radio Button */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Tipe Transaksi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer text-sm font-semibold transition ${formType === 'owed_to_me' ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'}`}>
                    <input
                      type="radio"
                      name="formType"
                      value="owed_to_me"
                      checked={formType === 'owed_to_me'}
                      onChange={() => setFormType('owed_to_me')}
                      className="sr-only"
                    />
                    Saya dihutang (Piutang)
                  </label>
                  <label className={`flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer text-sm font-semibold transition ${formType === 'i_owe' ? 'bg-rose-500/10 border-rose-500/35 text-rose-400' : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'}`}>
                    <input
                      type="radio"
                      name="formType"
                      value="i_owe"
                      checked={formType === 'i_owe'}
                      onChange={() => setFormType('i_owe')}
                      className="sr-only"
                    />
                    Saya hutang (Utang)
                  </label>
                </div>
              </div>

              {/* Nama Orang */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Nama Orang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi, Susi"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-slate-200 placeholder-slate-600"
                />
              </div>

              {/* Jumlah Uang */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Jumlah Uang (Rupiah) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-sm font-semibold">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    placeholder="Contoh: 50000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-slate-200 placeholder-slate-600"
                  />
                </div>
                {formAmount && !isNaN(Number(formAmount)) && (
                  <p className="text-[11px] text-slate-400 mt-1 pl-1">
                    Konversi: <strong className="text-slate-200">{formatRupiah(Number(formAmount))}</strong>
                  </p>
                )}
              </div>

              {/* Tanggal */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Tanggal Transaksi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-slate-200"
                />
              </div>

              {/* Catatan */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    Catatan (Opsional)
                  </label>
                  <span className={`text-[10px] ${formNote.length > 200 ? 'text-rose-455 font-bold' : 'text-slate-500'}`}>
                    {formNote.length}/200
                  </span>
                </div>
                <textarea
                  placeholder="Beri catatan pendukung (maks. 200 karakter)..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value.slice(0, 200))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm text-slate-200 placeholder-slate-600 resize-none"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-455 hover:to-teal-555 text-slate-950 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/5 transition cursor-pointer"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
