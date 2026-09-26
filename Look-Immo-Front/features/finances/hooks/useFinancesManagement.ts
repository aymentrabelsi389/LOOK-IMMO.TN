import React, { useState, useMemo, useEffect } from 'react';
import { Property, FinanceTransaction } from '@/types';
import { transactionsAPI } from '@/services/api';
import { useConfirm } from '@/context/ConfirmContext';

interface UseFinancesManagementProps {
  properties: Property[];
  showNotification: (msg: string, type: 'success' | 'error') => void;
}

export function useFinancesManagement({ properties, showNotification }: UseFinancesManagementProps) {
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
      totalRevenue += t.commission;
      
      if (t.type === 'vente') {
        totalSales += t.commission;
      } else {
        totalRentals += t.commission;
      }

      totalCommissions += t.commission;

      const tDate = new Date(t.date);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        monthRevenue += t.commission;
      }
    });

    const unpaidCount = transactions.filter(t => !t.paymentReceived).length;

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
      const searchMatch = 
        t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());

      const typeMatch = filterType === 'all' || t.type === filterType;

      const paymentMatch = 
        filterPayment === 'all' || 
        (filterPayment === 'paid' && t.paymentReceived) ||
        (filterPayment === 'pending' && !t.paymentReceived);

      const tDate = new Date(t.date);
      const monthMatch = filterMonth === 'all' || (tDate.getMonth() + 1).toString() === filterMonth;
      const yearMatch = filterYear === 'all' || tDate.getFullYear().toString() === filterYear;

      return searchMatch && typeMatch && paymentMatch && monthMatch && yearMatch;
    });

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

  return {
    fetchTransactions,
    transactions,
    loading,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    showAll,
    setShowAll,
    filterType,
    setFilterType,
    filterPayment,
    setFilterPayment,
    filterMonth,
    setFilterMonth,
    filterYear,
    setFilterYear,
    isModalOpen,
    setIsModalOpen,
    editingTransaction,
    setEditingTransaction,
    formData,
    setFormData,
    handleFormChange,
    handleSubmit,
    handleDelete,
    handleMarkPaid,
    handleExportCSV,
    kpis,
    todayWidget,
    filteredTransactions,
    paginatedTransactions,
    totalPages,
    monthsList,
    yearsList,
    topProperties,
    bestMonth,
    chartData,
    formatPrice,
    properties
  };
}
