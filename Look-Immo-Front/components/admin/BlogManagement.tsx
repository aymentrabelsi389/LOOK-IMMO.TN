
import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, FileText, 
  RefreshCw, X, Image as ImageIcon,
  ChevronLeft, ChevronRight, List, Calendar,
  ChevronDown, Check
} from 'lucide-react';
import { BlogPost } from '@/types';
import { blogAPI } from '@/services/api';
import { useConfirm } from '@/context/ConfirmContext';


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
  triggerClassName = "w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-brand-teal/50 focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 transition-all text-[10px] font-black text-gray-600 uppercase tracking-widest cursor-pointer",
  menuClassName = "absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up",
  optionClassName = "w-full flex items-center justify-between px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors"
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
                  : 'text-gray-600 hover:bg-gray-50'
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

interface BlogManagementProps {
  blogPosts: BlogPost[];
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  showNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

const BlogManagement = ({
  blogPosts,
  setBlogPosts,
  showNotification
}: BlogManagementProps) => {
  const { confirm } = useConfirm();
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'title'>('date-desc');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAll, setShowAll] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    excerpt: '',
    content: '',
    image: '',
    published: false
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddModal = () => {
    setFormData({ title: '', category: '', excerpt: '', content: '', image: '', published: true });
    setIsEditing(false);
    setEditingPost(null);
    setShowModal(true);
  };

  const openEditModal = (post: BlogPost) => {
    setFormData({
      title: post.title,
      category: post.category,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image,
      published: post.published || false
    });
    setIsEditing(true);
    setEditingPost(post);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-generate excerpt from content (first 150 chars)
    const generatedExcerpt = formData.content.substring(0, 150) + (formData.content.length > 150 ? '...' : '');

    // Prepare data to save
    const dataToSave = {
      ...formData,
      excerpt: generatedExcerpt,
      published: true // Always publish immediately
    };

    try {
      if (isEditing && editingPost) {
        await blogAPI.update(editingPost.id, dataToSave);
        setBlogPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...dataToSave, updatedAt: Date.now() } : p));
        showNotification('success', 'Article mis à jour');
      } else {
        const newPost = await blogAPI.create(dataToSave);
        setBlogPosts(prev => [newPost, ...prev]);
        showNotification('success', 'Article créé avec succès');
      }
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save blog post:", error);
      showNotification('error', 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer l\'article ?',
      message: 'Êtes-vous sûr de vouloir supprimer définitivement cet article de blog ? Cette action est irréversible.',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      variant: 'danger'
    });
    if (confirmed) {
      try {
        await blogAPI.delete(id);
        setBlogPosts(prev => prev.filter(p => p.id !== id));
        showNotification('success', 'Article supprimé');
      } catch (error) {
        console.error("Failed to delete blog post:", error);
        showNotification('error', 'Erreur lors de la suppression');
      }
    }
  };

  const sortedPosts = [...blogPosts].sort((a, b) => {
    if (sortBy === 'date-desc') return b.createdAt - a.createdAt;
    if (sortBy === 'date-asc') return a.createdAt - b.createdAt;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return 0;
  });

  const totalPages = Math.ceil(sortedPosts.length / itemsPerPage);
  const paginatedPosts = showAll ? sortedPosts : sortedPosts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion du Blog</h1>
          <p className="text-sm text-gray-500 mt-1">{blogPosts.length} article(s) publié(s)</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'date-desc', label: '📅 Plus récent' },
              { value: 'date-asc', label: '📅 Plus ancien' },
              { value: 'title', label: '📝 Titre (A-Z)' }
            ]}
            triggerClassName="w-full sm:w-[220px] flex items-center justify-between gap-3 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10 shadow-sm text-xs font-bold text-gray-600 cursor-pointer hover:border-brand-teal/50 transition bg-white"
            menuClassName="absolute right-0 z-[60] mt-2 w-full sm:w-[220px] bg-white border border-gray-100 rounded-2xl shadow-lg py-2 overflow-y-auto max-h-60 animate-fade-in-up"
            optionClassName="w-full flex items-center justify-between px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          />

          <button
            onClick={openAddModal}
            className="w-full sm:w-auto bg-brand-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-dark/20 hover:bg-brand-primary transition transform active:scale-95 flex items-center justify-center"
          >
            <Plus size={18} className="mr-2" /> Nouvel Article
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {blogPosts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <FileText className="text-gray-100 mb-6" size={64} />
              <h3 className="text-xl font-black text-gray-900 mb-2">Aucun article</h3>
              <p className="text-gray-500 text-sm mb-8">Partagez vos conseils immobiliers et actualités avec vos clients en créant votre premier article.</p>
              <button
                onClick={openAddModal}
                className="px-8 py-3 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 hover:bg-brand-primary transition-all"
              >
                Créer un article
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-5">Article</th>
                    <th className="px-6 py-5">Catégorie</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedPosts.map(post => (
                    <tr key={post.id} className="group hover:bg-blue-50/30 transition-all duration-200 cursor-default">
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className="w-16 h-12 rounded-xl overflow-hidden shadow-sm border border-gray-100 mr-4 shrink-0 group-hover:scale-105 transition-transform">
                            <img src={post.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-black text-gray-900 group-hover:text-brand-dark transition-colors truncate pr-4">{post.title}</h4>
                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{post.excerpt}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-teal-50 text-brand-teal border border-teal-100/50">
                          {post.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center text-xs font-bold text-gray-500">
                          <Calendar size={14} className="mr-2 text-gray-300" />
                          {formatDate(post.createdAt)}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(post)}
                            className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-brand-dark hover:shadow-sm transition-all"
                            title="Modifier"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="p-2.5 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:shadow-sm transition-all"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedPosts.map(post => (
                <div key={post.id} className="p-5 bg-white hover:bg-gray-50 transition-colors space-y-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-sm border border-gray-100 shrink-0">
                      <img src={post.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-teal-50 text-brand-teal mb-2">
                        {post.category}
                      </span>
                      <h4 className="font-black text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">{post.title}</h4>
                      <p className="text-[10px] text-gray-400 line-clamp-2 leading-normal">{post.excerpt}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <Calendar size={12} className="mr-1.5" />
                      {formatDate(post.createdAt)}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(post)} className="p-2 bg-gray-50 text-gray-400 rounded-lg active:bg-brand-dark active:text-white transition-all">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(post.id)} className="p-2 bg-gray-50 text-gray-400 rounded-lg active:bg-red-500 active:text-white transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 font-medium">
                Affichage de <span className="font-bold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * itemsPerPage, sortedPosts.length)}</span> sur <span className="font-bold text-gray-900">{sortedPosts.length}</span>
              </div>

              <div className="flex items-center gap-3">
                {sortedPosts.length > itemsPerPage && (
                  <button
                    onClick={() => setShowAll(!showAll)}
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
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
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
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col scale-100 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-none">{isEditing ? 'Modifier l\'article' : 'Nouvel article'}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Rédaction et publication</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Titre de l'article</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm font-bold focus:outline-none focus:border-brand-teal focus:bg-white transition-all shadow-sm"
                      placeholder="Saisissez un titre accrocheur..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Catégorie</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm font-bold focus:outline-none focus:border-brand-teal focus:bg-white transition-all shadow-sm"
                      placeholder="Ex: Conseils, Marché..."
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Image de couverture</label>
                  <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center h-[145px] relative group hover:border-brand-teal/50 transition-all overflow-hidden">
                    {formData.image ? (
                      <>
                        <img src={formData.image} alt="Preview" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white font-black text-[10px] uppercase tracking-widest bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg border border-white/30">Changer l'image</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <ImageIcon size={32} className="mb-2 text-gray-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Importer une photo</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleImageUpload} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contenu de l'article</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-gray-900 text-sm font-medium focus:outline-none focus:border-brand-teal focus:bg-white transition-all shadow-sm h-72 resize-none leading-relaxed"
                  placeholder="Rédigez votre article ici..."
                  required
                />
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition">Annuler</button>
                <button type="submit" className="px-8 py-3 bg-brand-dark text-white font-bold rounded-xl shadow-lg shadow-brand-dark/20 hover:bg-brand-primary transition transform active:scale-95 flex items-center justify-center">
                  {isEditing ? <><RefreshCw size={18} className="mr-2" /> Mettre à jour</> : <><Plus size={18} className="mr-2" /> Publier l'article</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
