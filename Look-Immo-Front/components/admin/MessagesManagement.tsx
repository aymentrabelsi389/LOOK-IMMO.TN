
import React, { useState, useEffect } from 'react';
import { 
  Search, Mail, Eye, Trash2, 
  X, Check, Phone,
  ChevronLeft, ChevronRight, List, Calendar, Clock, ChevronDown
} from 'lucide-react';
import { Message } from '../../types';
import { messagesAPI } from '../../services/api';

interface CustomDropdownProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

const CustomDropdown = <T extends string>({
  value,
  onChange,
  options,
  triggerClassName = "w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-xs font-bold text-gray-600 cursor-pointer",
  menuClassName = "absolute right-0 z-[60] mt-2 w-full sm:w-[220px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up",
  optionClassName = "w-full flex items-center justify-between px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
}: CustomDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative inline-block w-full sm:w-auto" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClassName}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown size={14} className={`text-gray-400 transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={menuClassName}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`${optionClassName} ${
                opt.value === value
                  ? 'bg-brand-teal/5 text-brand-teal font-black'
                  : ''
              }`}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={12} className="text-brand-teal flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface MessagesManagementProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const MessagesManagement = ({
  messages,
  setMessages
}: MessagesManagementProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'status'>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ensure messages is an array
  if (!Array.isArray(messages)) return null;

  // Filter messages by search query
  const filteredMessages = messages.filter(msg =>
    msg &&
    ((msg.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.subject || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort messages
  const sortedMessages = [...filteredMessages].sort((a, b) => {
    if (sortBy === 'status') {
      if (a.status === 'new' && b.status === 'read') return -1;
      if (a.status === 'read' && b.status === 'new') return 1;
      return b.sentDate - a.sentDate; // Fallback to newest first
    }
    if (sortBy === 'date-asc') {
      return a.sentDate - b.sentDate; // Oldest first
    }
    return b.sentDate - a.sentDate; // Newest first (date-desc)
  });

  const totalPages = Math.ceil(sortedMessages.length / itemsPerPage);
  const paginatedMessages = showAll ? sortedMessages : sortedMessages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleViewMessage = async (msg: Message) => {
    setSelectedMessage(msg);
    setConfirmDelete(false);
    // Mark as read in backend if it's new/unread
    if (msg.status === 'new') {
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, status: 'read' as const } : m
      ));
      try {
        await messagesAPI.update(msg.id, { status: 'read' });
      } catch (e) {
        console.error('Failed to mark message as read', e);
      }
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setIsDeleting(true);
    try {
      await messagesAPI.delete(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      setSelectedMessage(null);
      setConfirmDelete(false);
    } catch (e) {
      console.error('Failed to delete message', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const newMessagesCount = messages.filter(m => m && m.status === 'new').length;

  const formatDate = (timestamp: number) => {
    if (timestamp === undefined || timestamp === null || isNaN(timestamp)) {
      return 'Date inconnue';
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Date inconnue';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Messages</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les prises de contact de vos clients</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 px-5 py-2.5 bg-brand-teal/5 rounded-xl border border-brand-teal/10 shadow-sm">
            <Mail size={18} className="text-brand-teal" />
            <span className="text-xs font-black text-brand-teal uppercase tracking-widest">{newMessagesCount} Nouveau{newMessagesCount > 1 ? 'x' : ''}</span>
          </div>

          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'date-desc', label: '📅 Plus récent' },
              { value: 'date-asc', label: '📅 Plus ancien' },
              { value: 'status', label: '✨ Par Statut' }
            ]}
            triggerClassName="w-full sm:w-[220px] flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 shadow-sm text-xs font-bold text-gray-600 cursor-pointer hover:border-brand-teal/50 transition bg-white"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher par nom, email ou sujet..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm focus:outline-none focus:border-brand-teal transition-all outline-none"
        />
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedMessages.length === 0 ? (
          <div className="p-20 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <Mail size={64} className="text-gray-100 mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Aucun message</h3>
              <p className="text-gray-500 text-sm">Les messages de vos clients apparaîtront ici.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Expéditeur</th>
                    <th className="px-6 py-5">Sujet</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Statut</th>
                    <th className="px-8 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedMessages.map(msg => (
                    <tr key={msg.id} className={`group hover:bg-blue-50/30 transition-all duration-200 cursor-pointer ${msg.status === 'new' ? 'bg-brand-teal/5' : ''}`} onClick={() => handleViewMessage(msg)}>
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all font-black text-xs">
                              {msg.fullName.charAt(0)}
                            </div>
                            {msg.status === 'new' && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-teal rounded-full border-2 border-white animate-pulse"></span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-black text-gray-900 group-hover:text-brand-dark transition-colors">{msg.fullName}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{msg.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-xs">
                        <div className={`text-xs font-black text-gray-700 truncate ${msg.status === 'new' ? 'text-brand-dark' : ''}`}>
                          {msg.subject}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            <Calendar size={12} className="mr-2 text-brand-teal" />
                            {formatDate(msg.sentDate)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          msg.status === 'new' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/20' : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${msg.status === 'new' ? 'bg-brand-teal' : 'bg-gray-400'}`}></span>
                          {msg.status === 'new' ? 'Nouveau' : 'Lu'}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2.5 bg-white border border-gray-200 text-brand-teal rounded-xl group-hover:shadow-sm transition-all">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedMessages.map(msg => (
                <div key={msg.id} className={`p-5 hover:bg-gray-50 transition-colors space-y-4 ${msg.status === 'new' ? 'bg-brand-teal/5 border-l-4 border-l-brand-teal' : 'bg-white'}`} onClick={() => handleViewMessage(msg)}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400 font-black text-xs uppercase tracking-widest">
                        {msg.fullName.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <h4 className="font-black text-gray-900 leading-none mb-1">{msg.fullName}</h4>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[150px]">{msg.email}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                      msg.status === 'new' ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {msg.status === 'new' ? 'Nouveau' : 'Lu'}
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                    <h5 className="text-[11px] font-black text-gray-800 leading-tight">{msg.subject}</h5>
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{msg.message}</p>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-black text-gray-400 uppercase tracking-widest pt-2">
                    <div className="flex items-center">
                      <Calendar size={12} className="mr-1.5 text-brand-teal" />
                      {formatDate(msg.sentDate)}
                    </div>
                    <button className="flex items-center gap-1.5 text-brand-teal font-black">
                      LIRE <ChevronRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-medium">
                Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedMessages.length)}</span> sur <span className="font-bold text-gray-900">{sortedMessages.length}</span>
              </div>

              <div className="flex items-center gap-3">
                {sortedMessages.length > itemsPerPage && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm mr-2 ${
                      showAll 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List size={14} />
                    {showAll ? 'Pagination' : 'Afficher tout'}
                  </button>
                )}

                {!showAll && totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={(e) => { e.stopPropagation(); setCurrentPage(page); }}
                        className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
                      disabled={currentPage === totalPages}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-brand-dark/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => { setSelectedMessage(null); setConfirmDelete(false); }}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white relative">
              <button
                onClick={() => { setSelectedMessage(null); setConfirmDelete(false); }}
                className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-400 rounded-xl hover:bg-gray-200 hover:text-gray-600 transition-all active:scale-90"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal font-black text-2xl shadow-inner">
                  {selectedMessage.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-none mb-2">{selectedMessage.fullName}</h3>
                  <div className="flex flex-wrap gap-3">
                    <a href={`mailto:${selectedMessage.email}`} className="flex items-center gap-2 text-[10px] font-black text-brand-teal bg-brand-teal/5 px-2.5 py-1 rounded-lg uppercase tracking-widest hover:bg-brand-teal hover:text-white transition-colors">
                      <Mail size={12} /> {selectedMessage.email}
                    </a>
                    <a href={`tel:${selectedMessage.phone}`} className="flex items-center gap-2 text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-widest hover:bg-gray-200 hover:text-gray-600 transition-colors">
                      <Phone size={12} /> {selectedMessage.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex gap-4">
                  <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Calendar size={14} className="mr-2 text-brand-teal" />
                    {formatDate(selectedMessage.sentDate)}
                  </div>
                  <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <Clock size={14} className="mr-2" />
                    {formatTime(selectedMessage.sentDate)}
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  selectedMessage.status === 'new' ? 'bg-brand-teal text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {selectedMessage.status === 'new' ? 'Nouveau Message' : 'Déjà Lu'}
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Sujet du message</h4>
                <div className="text-lg font-black text-brand-dark leading-tight">
                  {selectedMessage.subject}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Contenu</h4>
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[150px]">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedMessage.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {confirmDelete ? (
                  <>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      disabled={isDeleting}
                      className="flex-1 py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/25"
                    >
                      {isDeleting ? 'Suppression...' : 'Confirmer Supprimer'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setSelectedMessage(null); setConfirmDelete(false); }}
                      className="flex-1 py-4 bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="px-6 py-4 bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                      <Trash2 size={18} /> Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessagesManagement;
