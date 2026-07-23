import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { BlogPost } from '@/types';
import InfiniteCarousel from './InfiniteCarousel';

const NewsSection = ({ blogPosts, onSelectPost }: { blogPosts: BlogPost[], onSelectPost: (id: string) => void }) => {
  if (blogPosts.length === 0) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 rounded-full bg-brand-dark text-brand-teal text-xs font-bold tracking-wider uppercase mb-3">Blog & Actualités</span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-brand-dark">Actualités Immo</h2>
          <p className="text-gray-500 mt-4 max-w-2xl mx-auto text-sm md:text-base">
            Restez informé des dernières tendances, conseils et actualités du marché immobilier tunisien.
          </p>
        </div>

        {/* Carousel Container */}
        <InfiniteCarousel
          items={blogPosts}
          renderItem={(post) => (
            <div className="relative group h-full">
              {/* Blue Glow Shadow Effect for Blog Cards */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-teal to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <div className="relative h-full bg-white rounded-xl overflow-hidden">
                <Link
                  to={`/blog-post/${post.id}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                    e.preventDefault();
                    onSelectPost(post.id);
                  }}
                  className="animate-fade-in h-full flex flex-col"
                >
                  <article className="h-full flex flex-col">
                  <div className="relative h-48 overflow-hidden mb-4 flex-shrink-0">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition duration-500" 
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute top-3 left-3 bg-brand-teal px-3 py-1 rounded-full text-xs font-bold text-white uppercase shadow-sm">
                      {post.category}
                    </div>
                  </div>
                  <div className="flex-grow flex flex-col px-4 pb-4">
                    <div className="flex items-center text-xs text-gray-400 mb-2">
                      <Calendar size={12} className="mr-1" />
                      {formatDate(post.createdAt)}
                    </div>
                    <h3 className="text-lg font-bold text-brand-dark group-hover:text-brand-teal transition leading-tight mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto flex items-center text-sm text-brand-teal font-medium group-hover:translate-x-1 transition-transform">
                      Lire la suite <ArrowRight size={14} className="ml-1" />
                    </div>
                  </div>
                  </article>
                </Link>
              </div>
            </div>
          )}
        />
      </div>
    </section>
  );
};

export default NewsSection;
