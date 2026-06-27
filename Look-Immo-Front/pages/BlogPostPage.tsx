import React from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

import { useParams } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedBlogPostId: contextPostId, handleNavigate } = useUI();
  const postId = id || contextPostId;
  const { blogPosts } = useData();

  const post = blogPosts.find(p => p.id === postId);
  const onBack = () => handleNavigate('blog');

  useSEO({
    title: post ? post.title : "Article de blog",
    description: post ? `${post.excerpt || post.content.substring(0, 150)}...` : "Découvrez cet article sur le blog Look Immo."
  });

  if (!post) return <div className="text-center py-20">Article non trouvé</div>;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const content = post.content || '';
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <div className="relative h-[380px] overflow-hidden">
        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pb-20">
          <span className="inline-block text-white text-sm font-bold px-5 py-1.5 rounded-full mb-6 bg-[#06B6D4]">{post.category}</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white max-w-4xl leading-tight mb-6">{post.title}</h1>
          <div className="flex items-center text-white/90 text-sm space-x-4">
            <span className="flex items-center"><Calendar size={16} className="mr-2" />{formatDate(post.createdAt)}</span>
            <span className="text-white/50">•</span>
            <span className="flex items-center"><Clock size={16} className="mr-2" />{readingTime} min de lecture</span>
          </div>
        </div>
      </div>

      <div className="max-w-[850px] mx-auto px-4 relative -mt-10">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-[#06B6D4] transition mb-6 text-sm">
          <ChevronRight size={18} className="rotate-180 mr-1" /> Retour au blog
        </button>

        <article className="bg-white rounded-2xl shadow-lg overflow-hidden p-10 prose prose-lg max-w-none">
          {post.content.split('\n\n').map((para, i) => <p key={i} className="mb-6 leading-relaxed">{para}</p>)}
        </article>
      </div>
    </div>
  );
};

export default BlogPostPage;
