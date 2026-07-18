import React from 'react';
import { Calendar, ArrowRight, FileText } from 'lucide-react';

import { useSEO } from '@/hooks/useSEO';
import { useData } from '@/context/DataContext';

const BlogPage = () => {
  useSEO({
    title: "Blog & Actualités Immobilières",
    description: "Suivez les dernières tendances du marché de l'immobilier en Tunisie, conseils de vente, guides d'achat et actualités de notre agence."
  });

  const { blogPosts, handleSelectBlogPost: onSelectPost } = useData();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const visiblePosts = blogPosts.filter(p => p.published);

  return (
    <div className="min-h-screen bg-brand-light">
      <div className="bg-gradient-to-r from-brand-dark to-blue-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Blog & Actualités</h1>
          <p className="text-xl text-gray-200">Conseils d'investissement et tendances du secteur.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {visiblePosts.map(post => (
            <div key={post.id} className="relative group h-full">
              {/* Blue Glow Shadow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <article
                onClick={() => onSelectPost(post.id)}
                className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group cursor-pointer h-full flex flex-col justify-between isolate"
              >
                <div>
                  <div className="relative h-48 overflow-hidden">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <span className="absolute top-4 left-4 bg-brand-teal text-white text-xs font-bold px-3 py-1 rounded-full">{post.category}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar size={14} className="mr-2" />
                      {formatDate(post.createdAt)}
                    </div>
                    <h2 className="text-xl font-bold text-brand-dark mb-3 line-clamp-2 group-hover:text-brand-teal transition">{post.title}</h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-0">
                  <div className="inline-flex items-center text-brand-teal font-semibold group-hover:translate-x-1 transition-transform">
                    Lire la suite <ArrowRight size={16} className="ml-2" />
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
        {visiblePosts.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>Aucun article disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogPage;
