import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Key, Percent, Calendar, Filter, Search, 
  Plus, Edit2, Trash2, CheckCircle, AlertCircle, Download, 
  BarChart3, RefreshCw, X,
  MapPin, Check, ArrowUpRight, ChevronDown
} from 'lucide-react';
import { Property, FinanceTransaction } from '../../types';
import { transactionsAPI } from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { CustomDatePicker } from '../ui/DateTimePicker';


// ── Custom styled dropdown (consistent with other admin panels) ──────────────
interface DropdownOption { value: string; label: string; }
interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: DropdownOption[];
  placeholder?: string;
}
const CustomDropdown = ({ value, onChange, options, placeholder }: CustomDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-brand-teal hover:bg-white transition-all focus:outline-none focus:border-brand-teal focus:bg-white cursor-pointer"
      >
        <span className={selected && selected.value !== 'all' && selected.value !== '' ? 'text-brand-dark font-semibold' : 'text-gray-500'}>
          {selected ? selected.label : (placeholder || 'Sélectionner')}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-xl overflow-y-auto max-h-60 animate-scale-in">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                value === opt.value ? 'bg-teal-50 text-brand-teal font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
              {value === opt.value && <Check size={14} className="text-brand-teal" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface FinancesManagementProps {
  properties: Property[];
  showNotification: (msg: string, type: 'success' | 'error') => void;
}

const FinancesManagement = ({ properties, showNotification }: FinancesManagementProps) => {
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'vente',
    propertyTitle: '',
    clientName: '',
    date: new Date().toISOString().substring(0, 10),
    commission: '',
    paymentReceived: false,
    paymentMode: 'virement',
    notes: ''
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionsAPI.getAll();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      showNotification('Erreur lors du chargement des transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Sync edit form when transaction is selected
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        type: editingTransaction.type,
        propertyTitle: editingTransaction.propertyTitle,
        clientName: editingTransaction.clientName,
        date: new Date(editingTransaction.date).toISOString().substring(0, 10),
        commission: editingTransaction.commission.toString(),
        paymentReceived: editingTransaction.paymentReceived,
        paymentMode: editingTransaction.paymentMode,
        notes: editingTransaction.notes || ''
      });
    } else {
      setFormData({
        type: 'vente',
        propertyTitle: '',
        clientName: '',
        date: new Date().toISOString().substring(0, 10),
        commission: '',
        paymentReceived: false,
        paymentMode: 'virement',
        notes: ''
      });
    }
  }, [editingTransaction, isModalOpen]);

  // Handle Form Change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.commission) {
      showNotification('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }

    const payload = {
      type: formData.type as 'vente' | 'location',
      propertyTitle: formData.propertyTitle || 'Propriété générale',
      clientName: formData.clientName,
      date: new Date(formData.date).toISOString(),
      commission: parseFloat(formData.commission) || 0,
      paymentReceived: formData.paymentReceived,
      paymentMode: formData.paymentMode as 'espèces' | 'virement' | 'chèque',
      notes: formData.notes
    };

    try {
      if (editingTransaction) {
        await transactionsAPI.update(editingTransaction.id, payload);
        showNotification('Transaction mise à jour avec succès', 'success');
      } else {
        await transactionsAPI.create(payload);
        showNotification('Transaction créée avec succès', 'success');
      }
      setIsModalOpen(false);
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      showNotification('Erreur lors de l\'enregistrement', 'error');
    }
  };

  // Delete Transaction
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la transaction ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement cette transaction financière ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await transactionsAPI.delete(id);
        showNotification('Transaction supprimée avec succès', 'success');
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification('Erreur lors de la suppression', 'error');
      }
    }
  };

  // Toggle paid directly from table
  const handleMarkPaid = async (tx: FinanceTransaction) => {
    try {
      await transactionsAPI.update(tx.id, { paymentReceived: !tx.paymentReceived });
      showNotification(
        tx.paymentReceived ? 'Transaction marquée comme en attente' : 'Transaction marquée comme payée',
        'success'
      );
      fetchTransactions();
    } catch (error) {
      console.error('Error updating payment status:', error);
      showNotification('Erreur lors du changement de statut', 'error');
    }
  };

  // Profit KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0;
    let totalSales = 0;
    let totalRentals = 0;
    let totalCommissions = 0;
    let monthRevenue = 0;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions.forEach(t => {
      // CA total is the sum of transaction amounts
      totalRevenue += t.commission;
      
      if (t.type === 'vente') {
        totalSales += t.commission;
      } else {
        totalRentals += t.commission;
      }

      totalCommissions += t.commission;

      // Current Month CA
      const tDate = new Date(t.date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        monthRevenue += t.commission;
      }
    });

    // Unpaid counts
    const unpaidCount = transactions.filter(t => !t.paymentReceived).length;

    // Averages
    const salesList = transactions.filter(t => t.type === 'vente');
    const rentalsList = transactions.filter(t => t.type === 'location');
    const avgSale = salesList.length > 0 ? totalSales / salesList.length : 0;
    const avgRent = rentalsList.length > 0 ? totalRentals / rentalsList.length : 0;

    return {
      totalRevenue,
      totalSales,
      totalRentals,
      totalCommissions,
      monthRevenue,
      unpaidCount,
      avgSale,
      avgRent
    };
  }, [transactions]);

  // Today Widget KPIs
  const todayWidget = useMemo(() => {
    let sales = 0;
    let locations = 0;
    let revenue = 0;
    const todayStr = new Date().toISOString().substring(0, 10);

    transactions.forEach(t => {
      const tDateStr = new Date(t.date).toISOString().substring(0, 10);
      if (tDateStr === todayStr) {
        revenue += t.commission;
        if (t.type === 'vente') sales++;
        else locations++;
      }
    });

    return { sales, locations, revenue };
  }, [transactions]);

  // Filtering & Searching logic
  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      // Search
      const searchMatch = 
        t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());

      // Type
      const typeMatch = filterType === 'all' || t.type === filterType;

      // Payment Status
      const paymentMatch = 
        filterPayment === 'all' || 
        (filterPayment === 'paid' && t.paymentReceived) ||
        (filterPayment === 'pending' && !t.paymentReceived);

      // Month
      const tDate = new Date(t.date);
      const monthMatch = filterMonth === 'all' || (tDate.getMonth() + 1).toString() === filterMonth;

      // Year
      const yearMatch = filterYear === 'all' || tDate.getFullYear().toString() === filterYear;

      return searchMatch && typeMatch && paymentMatch && monthMatch && yearMatch;
    });

    // Sort descending by date, fallback to createdAt
    return filtered.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff === 0 && a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return dateDiff;
    });
  }, [transactions, searchQuery, filterType, filterPayment, filterMonth, filterYear]);

  // Pagination Logic
  const ITEMS_PER_PAGE = 5;
  const paginatedTransactions = useMemo(() => {
    if (showAll) return filteredTransactions;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage, showAll]);
  
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));

  // Months names array
  const monthsList = [
    { value: '1', label: 'Janvier' },
    { value: '2', label: 'Février' },
    { value: '3', label: 'Mars' },
    { value: '4', label: 'Avril' },
    { value: '5', label: 'Mai' },
    { value: '6', label: 'Juin' },
    { value: '7', label: 'Juillet' },
    { value: '8', label: 'Août' },
    { value: '9', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' }
  ];

  // Available Years
  const yearsList = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Top Performing Properties KPI
  const topProperties = useMemo(() => {
    const propertyCAMap: Record<string, number> = {};
    transactions.forEach(t => {
      propertyCAMap[t.propertyTitle] = (propertyCAMap[t.propertyTitle] || 0) + t.commission;
    });

    return Object.entries(propertyCAMap)
      .map(([title, total]) => ({ title, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [transactions]);

  // Best Month KPI
  const bestMonth = useMemo(() => {
    const monthlyMap: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + t.commission;
    });

    let bestKey = '';
    let maxCA = 0;
    Object.entries(monthlyMap).forEach(([key, val]) => {
      if (val > maxCA) {
        maxCA = val;
        bestKey = key;
      }
    });

    if (!bestKey) return { label: 'Aucun', value: 0 };
    const [year, month] = bestKey.split('-');
    const monthLabel = monthsList.find(m => m.value === month)?.label || '';
    return {
      label: `${monthLabel} ${year}`,
      value: maxCA
    };
  }, [transactions]);

  // Data for visual SVG Chart (Monthly Revenue Trend - past 6 months)
  const chartData = useMemo(() => {
    const months: { label: string; monthNum: number; year: number; vente: number; location: number; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('fr-FR', { month: 'short' }),
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        vente: 0,
        location: 0,
        total: 0
      });
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const idx = months.findIndex(m => m.monthNum === tDate.getMonth() && m.year === tDate.getFullYear());
      if (idx !== -1) {
        if (t.type === 'vente') {
          months[idx].vente += t.commission;
        } else {
          months[idx].location += t.commission;
        }
        months[idx].total += t.commission;
      }
    });

    const maxVal = 100000;
    return { months, maxVal };
  }, [transactions]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID Transaction', 'Type', 'Client', 'Propriété', 'Date', 'Commission (DT)', 'Statut Paiement', 'Mode de Paiement', 'Notes'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.type === 'vente' ? 'Vente' : 'Location',
      t.clientName,
      t.propertyTitle,
      new Date(t.date).toLocaleDateString('fr-FR'),
      t.commission,
      t.paymentReceived ? 'Payé' : 'En attente',
      t.paymentMode,
      t.notes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rapport_Financier_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Rapport exporté au format CSV !', 'success');
  };



  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'TND', minimumFractionDigits: 0 }).format(amount).replace('TND', 'DT');
  };

  return (
    <>
      <div className="space-y-8 pb-16 animate-fade-in print:p-0 print:space-y-4">
      {/* Print-only title */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Look Immo - Rapport Financier</h1>
        <p className="text-gray-500">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      {/* Title & Add Transaction Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6 print:hidden">
        <div>
          <h2 className="text-3xl font-bold text-brand-dark font-serif tracking-tight flex items-center">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 w-2 h-8 rounded-full mr-3 shadow-md"></span>
            Finances & Revenus
          </h2>
          <p className="text-brand-grey text-sm mt-1">Supervisez et gérez vos flux de trésorerie, vos ventes et vos commissions en temps réel.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={fetchTransactions}
            className="p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-brand-teal shadow-sm hover:border-brand-teal/30 hover:bg-brand-teal/5 transition duration-200"
            title="Rafraîchir"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          
          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 shadow-sm transition duration-200 text-sm"
          >
            <Download size={16} />
            Exporter CSV
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-teal to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-brand-teal/20 transform hover:-translate-y-0.5 transition duration-200 text-sm"
          >
            <Plus size={18} />
            Nouvelle Transaction
          </button>
        </div>
      </div>

      {/* Payment Reminders Alert */}
      {kpis.unpaidCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border-l-4 border-amber-500 rounded-r-2xl p-4 flex items-center justify-between shadow-sm animate-pulse print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 p-2.5 rounded-full text-amber-600 shadow-inner">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm md:text-base">Attention : Paiements en attente</h4>
              <p className="text-amber-800 text-xs md:text-sm mt-0.5">
                Il y a actuellement <span className="font-bold text-amber-900 underline">{kpis.unpaidCount} transaction(s) en attente</span> de règlement. 
                Veuillez relancer vos clients pour régulariser.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setFilterPayment('pending')}
            className="hidden md:block text-xs font-bold text-amber-900 bg-amber-500/20 hover:bg-amber-500/30 px-3.5 py-1.5 rounded-lg transition"
          >
            Voir tout
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 2: Revenus Ventes */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition duration-300"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-brand-grey uppercase">Revenus Ventes</span>
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600 shadow-inner">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-brand-dark font-serif tracking-tight">
              {formatPrice(kpis.totalSales)}
            </h3>
            <p className="text-brand-grey text-xs mt-1 font-medium">Revenu cumulé des ventes</p>
          </div>
        </div>

        {/* KPI 3: Revenus Locations */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition duration-300"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-brand-grey uppercase">Revenus Locations</span>
            <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-600 shadow-inner">
              <Key size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-brand-dark font-serif tracking-tight">
              {formatPrice(kpis.totalRentals)}
            </h3>
            <p className="text-brand-grey text-xs mt-1 font-medium">Revenu cumulé des baux</p>
          </div>
        </div>

        {/* KPI 4: Revenus du Mois */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-soft relative overflow-hidden group hover:shadow-xl transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition duration-300"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-brand-grey uppercase">Revenus du Mois</span>
            <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-600 shadow-inner">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-brand-dark font-serif tracking-tight">
              {formatPrice(kpis.monthRevenue)}
            </h3>
            <p className="text-brand-grey text-xs mt-1 font-medium">Généré ce mois-ci</p>
          </div>
        </div>

        {/* KPI 5: Commission Totale */}
        <div className="bg-gradient-to-br from-brand-dark to-slate-900 rounded-2xl p-5 border border-slate-800 shadow-soft relative overflow-hidden group hover:shadow-xl hover:shadow-brand-dark/20 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-amber-500/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition duration-300"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-slate-300 uppercase">Commission Net</span>
            <div className="bg-amber-400/20 p-2.5 rounded-xl text-amber-400 shadow-inner">
              <Percent size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl md:text-2xl font-black text-white font-serif tracking-tight">
              {formatPrice(kpis.totalCommissions * 0.81)}
            </h3>
            <p className="text-amber-400/80 text-xs mt-1 font-bold flex items-center gap-1" title={`Commission brute: ${formatPrice(kpis.totalCommissions)}`}>
              <span>Après déduction de 19% (TVA)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Quick Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Visual SVG Chart (Monthly Trend) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-brand-dark font-serif flex items-center">
                <BarChart3 size={18} className="text-brand-teal mr-2" />
                Évolution mensuelle des revenus
              </h3>
              <p className="text-xs text-brand-grey mt-0.5">Tendance financière des 6 derniers mois (Ventes & Locations)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-brand-grey">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-brand-teal rounded"></span>
                <span>Ventes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-blue-500 rounded"></span>
                <span>Locations</span>
              </div>
            </div>
          </div>

          {/* SVG Custom Bar & Line Chart */}
          <div className="h-64 relative mt-4">
            <div className="absolute inset-0 flex flex-col justify-between">
              {[1, 2, 3, 4].map(line => (
                <div key={line} className="w-full border-t border-gray-100 h-0 flex items-center text-[10px] text-gray-400">
                  <span className="bg-white pr-2 -translate-y-2">
                    {formatPrice(Math.round((chartData.maxVal * (5 - line)) / 4))}
                  </span>
                </div>
              ))}
              <div className="w-full border-t-2 border-gray-200 h-0"></div>
            </div>

            {/* Bars container */}
            <div className="absolute inset-x-8 bottom-0 top-4 flex justify-between items-end">
              {chartData.months.map((m, index) => {
                const totalHeightPercent = m.total > 0 ? Math.min((m.total / chartData.maxVal) * 100, 100) : 0;
                const venteHeightPercent = m.total > 0 ? (m.vente / m.total) * 100 : 0;
                const locationHeightPercent = m.total > 0 ? (m.location / m.total) * 100 : 0;

                return (
                  <div key={index} className="flex flex-col items-center justify-end flex-1 group relative h-full">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-brand-dark text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg pointer-events-none z-20 w-32 text-center">
                      <p className="font-bold border-b border-white/20 pb-0.5 mb-1">{m.label}</p>
                      <p>Ventes: {formatPrice(m.vente)}</p>
                      <p>Loc: {formatPrice(m.location)}</p>
                    </div>

                    <div className="w-8 md:w-12 flex flex-col items-end rounded-t-lg overflow-hidden" style={{ height: `${totalHeightPercent}%` }}>
                      <div className="w-full bg-brand-teal transition-all duration-500 cursor-pointer hover:brightness-95" style={{ height: `${venteHeightPercent}%` }} title={`Ventes: ${formatPrice(m.vente)}`}></div>
                      <div className="w-full bg-blue-500 transition-all duration-500 cursor-pointer hover:brightness-95" style={{ height: `${locationHeightPercent}%` }} title={`Locations: ${formatPrice(m.location)}`}></div>
                    </div>

                    <span className="text-[11px] font-bold text-brand-dark mt-2 tracking-tight">{m.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Profit KPIs & Today Quick Widget */}
        <div className="space-y-6">
          {/* Dashboard Widget: Aujourd'hui */}
          <div className="bg-gradient-to-br from-brand-dark to-slate-900 rounded-3xl p-6 border border-slate-800 shadow-soft text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-[120px] -z-10"></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h4 className="text-sm font-black tracking-wider text-amber-400 uppercase">Aujourd'hui</h4>
                <p className="text-xs text-slate-400">Rapport d'activité temps réel</p>
              </div>
              <div className="bg-amber-400/20 px-3 py-1 rounded-full text-amber-400 text-xs font-bold shadow-inner">
                Live
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-black font-serif text-white">{todayWidget.sales}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Ventes</p>
              </div>
              <div className="border-x border-white/10">
                <p className="text-2xl font-black font-serif text-white">{todayWidget.locations}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Locations</p>
              </div>
              <div>
                <p className="text-lg font-black font-serif text-amber-400 truncate px-1">{formatPrice(todayWidget.revenue)}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">Revenus</p>
              </div>
            </div>
          </div>

          {/* Performance & Best KPIs List */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft space-y-4">
            <h4 className="text-sm font-black tracking-wider text-brand-dark uppercase border-b pb-2">Indicateurs de Performance</h4>
            
            <div className="space-y-3.5">
              {/* Avg Sale */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-grey font-medium">Panier Moyen Vente</span>
                <span className="font-bold text-brand-dark">{formatPrice(kpis.avgSale)}</span>
              </div>
              
              {/* Avg Rent */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-grey font-medium">Loyer Moyen Location</span>
                <span className="font-bold text-brand-dark">{formatPrice(kpis.avgRent)}</span>
              </div>

              {/* Best Month */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-brand-grey font-medium">Meilleur Mois Historique</span>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 text-sm">{bestMonth.label}</p>
                  <p className="text-[10px] text-brand-grey font-bold">({formatPrice(bestMonth.value)})</p>
                </div>
              </div>

              {/* Top Property */}
              <div className="border-t pt-3.5 space-y-2">
                <span className="text-xs font-bold text-brand-grey uppercase tracking-wider block">Propriétés Performantes (CA)</span>
                {topProperties.map((prop, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition">
                    <span className="text-brand-dark font-medium truncate max-w-[160px]" title={prop.title}>{prop.title}</span>
                    <span className="font-bold text-brand-teal">{formatPrice(prop.total)}</span>
                  </div>
                ))}
                {topProperties.length === 0 && (
                  <p className="text-xs text-brand-grey italic">Aucune donnée disponible</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Searching Panel */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-6">
          <h3 className="font-bold text-brand-dark font-serif flex items-center">
            <Filter size={18} className="text-brand-teal mr-2" />
            Filtres & Recherche
          </h3>
          <button 
            onClick={() => {
              setFilterType('all');
              setFilterPayment('all');
              setFilterMonth('all');
              setFilterYear('all');
              setSearchQuery('');
              setCurrentPage(1);
              setShowAll(false);
            }}
            className="text-xs font-bold text-brand-teal hover:underline flex items-center"
          >
            Réinitialiser les filtres
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search box */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Client, Propriété, ID..."
              className="w-full bg-gray-50 pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-teal focus:bg-white transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <div>
            <CustomDropdown
              value={filterType}
              onChange={setFilterType}
              options={[
                { value: 'all', label: 'Tous les Types' },
                { value: 'vente', label: '🏠 Vente' },
                { value: 'location', label: '🔑 Location' },
              ]}
            />
          </div>

          {/* Payment Status Filter */}
          <div>
            <CustomDropdown
              value={filterPayment}
              onChange={setFilterPayment}
              options={[
                { value: 'all', label: 'Tous les Règlements' },
                { value: 'paid', label: '✅ Payés' },
                { value: 'pending', label: '⏳ En attente' },
              ]}
            />
          </div>

          {/* Month Filter */}
          <div>
            <CustomDropdown
              value={filterMonth}
              onChange={setFilterMonth}
              options={[
                { value: 'all', label: 'Tous les Mois' },
                ...monthsList
              ]}
            />
          </div>

          {/* Year Filter */}
          <div>
            <CustomDropdown
              value={filterYear}
              onChange={setFilterYear}
              options={[
                { value: 'all', label: 'Toutes les Années' },
                ...yearsList.map(y => ({ value: y.toString(), label: y.toString() }))
              ]}
            />
          </div>
        </div>
      </div>

      {/* Transactions Table & Cards Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden">
        
        {/* Table Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 print:hidden">
          <h3 className="font-bold text-brand-dark font-serif">Transactions enregistrées</h3>
          <span className="text-xs bg-brand-teal/10 px-3 py-1 rounded-full text-brand-teal font-black">
            {filteredTransactions.length} transaction(s)
          </span>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="animate-spin text-brand-teal" size={32} />
            <p className="text-brand-grey text-sm">Chargement des transactions...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-brand-grey text-xs uppercase tracking-wider font-bold border-b border-gray-100">
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Propriété</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Commission</th>
                    <th className="px-6 py-4">Paiement</th>
                    <th className="px-6 py-4 text-right print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 transition duration-150">
                      <td className="px-6 py-4 font-mono text-xs text-brand-grey font-bold">
                        {tx.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          tx.type === 'vente' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {tx.type === 'vente' ? 'Vente' : 'Location'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-brand-dark">
                        {tx.clientName}
                      </td>
                      <td className="px-6 py-4 text-brand-grey font-medium max-w-[200px] truncate" title={tx.propertyTitle}>
                        {tx.propertyTitle}
                      </td>
                      <td className="px-6 py-4 text-brand-grey">
                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 font-black text-amber-600">
                        {formatPrice(tx.commission)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleMarkPaid(tx)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border cursor-pointer hover:scale-105 transition duration-150 ${
                            tx.paymentReceived 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                              : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                          }`}
                        >
                          {tx.paymentReceived ? (
                            <>
                              <CheckCircle size={12} />
                              Payé
                            </>
                          ) : (
                            <>
                              <AlertCircle size={12} />
                              En attente
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right print:hidden">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingTransaction(tx);
                              setIsModalOpen(true);
                            }}
                            className="p-2 text-gray-500 hover:text-brand-teal hover:bg-brand-teal/10 rounded-lg transition"
                            title="Modifier"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center p-12 text-brand-grey italic">
                        Aucune transaction trouvée pour ces filtres.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedTransactions.map((tx) => (
                <div key={tx.id} className="p-6 space-y-4 hover:bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-brand-grey font-bold">{tx.id}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      tx.type === 'vente' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}>
                      {tx.type === 'vente' ? 'Vente' : 'Location'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-brand-dark">{tx.clientName}</h4>
                    <p className="text-xs text-brand-grey flex items-center gap-1">
                      <MapPin size={12} className="text-brand-teal" />
                      {tx.propertyTitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <p className="text-brand-grey">Date</p>
                      <p className="font-bold text-brand-dark mt-0.5">{new Date(tx.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <p className="text-brand-grey">Règlement ({tx.paymentMode})</p>
                      <button
                        onClick={() => handleMarkPaid(tx)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer mt-1 ${
                          tx.paymentReceived 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                            : 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                        }`}
                      >
                        {tx.paymentReceived ? 'Payé' : 'En attente'}
                      </button>
                    </div>
                    <div>
                      <p className="text-brand-grey">Commission d'agence</p>
                      <p className="font-black text-amber-600 text-sm mt-0.5">{formatPrice(tx.commission)}</p>
                    </div>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-brand-grey italic bg-brand-light/40 p-2.5 rounded-lg border border-brand-teal/10">
                      {tx.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t pt-3 print:hidden">
                    <button
                      onClick={() => {
                        setEditingTransaction(tx);
                        setIsModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg text-xs"
                    >
                      <Edit2 size={12} />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg text-xs"
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <p className="text-center p-12 text-brand-grey italic text-sm">
                  Aucune transaction enregistrée.
                </p>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredTransactions.length > ITEMS_PER_PAGE && (
              <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30 print:hidden">
                <span className="text-sm text-brand-grey font-medium">
                  Affichage de {showAll ? filteredTransactions.length : Math.min(ITEMS_PER_PAGE, filteredTransactions.length - (currentPage - 1) * ITEMS_PER_PAGE)} sur {filteredTransactions.length} transaction(s)
                </span>
                
                <div className="flex items-center gap-2">
                  {!showAll && (
                    <>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition"
                      >
                        Précédent
                      </button>
                      <span className="text-sm font-bold text-brand-dark px-2">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-white transition"
                      >
                        Suivant
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => {
                      setShowAll(!showAll);
                      setCurrentPage(1);
                    }}
                    className="ml-4 px-4 py-1.5 text-sm font-bold text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 rounded-lg transition"
                  >
                    {showAll ? 'Voir moins' : 'Voir tout'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-brand-dark to-slate-900 text-white">
              <div>
                <h3 className="text-xl font-bold font-serif">
                  {editingTransaction ? 'Modifier la Transaction' : 'Nouvelle Transaction'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">Générez un rapport comptable de vos transactions foncières.</p>
              </div>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingTransaction(null);
                }}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Type selector */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-1.5 rounded-2xl border border-gray-200">
                {['vente', 'location'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: tab }))}
                    className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      formData.type === tab 
                        ? 'bg-gradient-to-r from-brand-teal to-blue-600 text-white shadow-md' 
                        : 'text-brand-grey hover:bg-gray-100'
                    }`}
                  >
                    {tab === 'vente' ? 'Vente' : 'Location'}
                  </button>
                ))}
              </div>

              {/* Client Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-brand-dark">Nom du Client *</label>
                <input
                  type="text"
                  name="clientName"
                  required
                  placeholder="Ex: Sonia Ben Salem"
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-brand-teal focus:bg-white transition"
                  value={formData.clientName}
                  onChange={handleFormChange}
                />
              </div>

              {/* Property Title Custom Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-brand-dark">Propriété associée *</label>
                <CustomDropdown
                  value={formData.propertyTitle}
                  onChange={(val) => setFormData(prev => ({ ...prev, propertyTitle: val }))}
                  placeholder="Sélectionnez un bien immobilier..."
                  options={[
                    { value: '', label: 'Sélectionnez un bien immobilier...' },
                    ...properties.map(p => ({
                      value: p.title,
                      label: `${p.title} (${p.listingType === 'sale' ? 'Vente' : 'Loc'})`
                    })),
                    { value: 'Autre Propriété', label: "Autre / Non listée dans l'application" }
                  ]}
                />
              </div>

              {/* Date & Mode */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-brand-dark">Date *</label>
                  <CustomDatePicker
                    value={formData.date}
                    onChange={(val) => setFormData(prev => ({ ...prev, date: val }))}
                    required
                    allowPastDates={true}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-brand-dark">Mode Paiement *</label>
                  <CustomDropdown
                    value={formData.paymentMode}
                    onChange={(val) => setFormData(prev => ({ ...prev, paymentMode: val }))}
                    options={[
                      { value: 'espèces', label: 'Espèces' },
                      { value: 'virement', label: 'Virement' },
                      { value: 'chèque', label: 'Chèque' }
                    ]}
                  />
                </div>
              </div>

              {/* Commission */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-brand-dark">Commission Agence (DT) *</label>
                <input
                  type="text"
                  name="commission"
                  required
                  placeholder="Ex: 5 000"
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-brand-teal focus:bg-white transition"
                  value={formData.commission ? formData.commission.toString().replace(/\s/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                  onChange={e => {
                    const raw = e.target.value.replace(/\s/g, '');
                    if (/^\d*$/.test(raw)) {
                      setFormData(prev => ({ ...prev, commission: raw }));
                    }
                  }}
                />
              </div>

              {/* Checkbox Paid */}
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200/50 p-4 rounded-xl">
                <input
                  type="checkbox"
                  id="paymentReceived"
                  name="paymentReceived"
                  className="w-5 h-5 accent-brand-teal rounded cursor-pointer"
                  checked={formData.paymentReceived}
                  onChange={handleFormChange}
                />
                <label htmlFor="paymentReceived" className="text-xs font-bold text-brand-dark cursor-pointer select-none">
                  Marquer comme paiement reçu / réglé ?
                </label>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-brand-dark">Notes / Observations</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Ex: Commission de 2% réglée. Vente finalisée chez Maître Notaire..."
                  className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-brand-teal focus:bg-white transition resize-none"
                  value={formData.notes}
                  onChange={handleFormChange}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTransaction(null);
                  }}
                  className="px-5 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition text-sm font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-brand-teal to-blue-600 text-white font-bold rounded-xl shadow-lg transition text-sm"
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FinancesManagement;
