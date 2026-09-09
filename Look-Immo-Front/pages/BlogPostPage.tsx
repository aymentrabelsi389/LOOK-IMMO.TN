import React, { useEffect, useState } from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSEO } from '@/hooks/useSEO';
import { useUI } from '@/context/UIContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { translateText } from '@/services/translationService';
import { blogAPI } from '@/services/api';
import LuxuryLoader from '@/components/ui/LuxuryLoader';

// Safely sanitize and process HTML content on the client side
const getSafeBlogContent = (content: string): string => {
  if (!content) return '';
  let html = content;
  // If content has no HTML tags, format it by converting double newlines to paragraphs
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    html = content
      .split('\n\n')
      .map(para => `<p>${para.replace(/\n/g, '<br />')}</p>`)
      .join('');
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'b', 'i', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'span', 'ul', 'ol', 'li', 'br', 'a', 'img', 'blockquote', 'pre', 'code',
      'hr', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'title', 'class', 'style', 'rel'],
  });
};

// Strip HTML tags to get plain text for translation
const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const BlogPostPage = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedBlogPostId: contextPostId, handleNavigate } = useUI();
  const postId = id || contextPostId;
  const { t, language } = useTranslation();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blogPost', postId],
    queryFn: () => blogAPI.getById(postId!),
    enabled: !!postId,
  });

  const onBack = () => handleNavigate('blog');

  // Auto-translate title and category
  const { displayText: displayTitle } = useAutoTranslate(post?.title);
  const { displayText: displayCategory } = useAutoTranslate(post?.category);

  // Auto-translate full article content
  const [displayContent, setDisplayContent] = useState<string>('');
  const [isTranslatingContent, setIsTranslatingContent] = useState(false);

  useEffect(() => {
    if (!post?.content) { setDisplayContent(''); return; }
    if (language !== 'en') { setDisplayContent(getSafeBlogContent(post.content)); return; }
    setIsTranslatingContent(true);
    const plainText = stripHtml(post.content);
    translateText(plainText, 'en', 'fr')
      .then((translated) => {
        const paras = translated.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
        const html = paras.length > 1 ? paras.map(p => `<p>${p}</p>`).join('') : `<p>${translated}</p>`;
        setDisplayContent(getSafeBlogContent(html));
      })
      .catch(() => setDisplayContent(getSafeBlogContent(post.content)))
      .finally(() => setIsTranslatingContent(false));
  }, [post?.content, language]);

  useSEO({
    title: post ? displayTitle || post.title : t('blogPostFallbackTitle'),
    description: post ? `${post.excerpt || (post.content ? post.content.substring(0, 150) : '')}...` : t('blogPostFallbackDesc')
  });

  // JSON-LD Structured Data for Google Rich Results (Article schema)
  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt || post.content.replace(/<[^>]+>/g, '').substring(0, 150),
    image: post.image,
    url: window.location.href,
    inLanguage: language === 'en' ? 'en' : 'fr-TN',
    articleSection: post.category || 'Immobilier',
    wordCount: post.content
      ? post.content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length
      : 0,
    datePublished: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    author: {
      '@type': 'Organization',
      name: 'Look Immo',
      url: window.location.origin,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Look Immo',
      logo: {
        '@type': 'ImageObject',
        url: `${window.location.origin}/look-immo-icon-gold.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': window.location.href,
    },
  } : null;

  if (isLoading) return <LuxuryLoader message={t('loadingArticle')} />;

  if (error || !post) return <div className="text-center py-20">{t('articleNotFound')}</div>;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const content = post.content || '';
  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="relative h-[380px] overflow-hidden">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pb-20 animate-fade-in-up">
            <span className="inline-block text-white text-sm font-bold px-5 py-1.5 rounded-full mb-6 bg-[#06B6D4]">{displayCategory || post.category}</span>
            <h1 className="text-4xl md:text-5xl font-bold text-white max-w-4xl leading-tight mb-6">{displayTitle || post.title}</h1>
            <div className="flex items-center text-white/90 text-sm space-x-4">
              <span className="flex items-center"><Calendar size={16} className="mr-2" />{formatDate(post.createdAt)}</span>
              <span className="text-white/50">â€¢</span>
              <span className="flex items-center"><Clock size={16} className="mr-2" />{t('readingTime', { count: readingTime })}</span>
            </div>
          </div>
        </div>

        <div className="max-w-[850px] mx-auto px-4 relative -mt-10 animate-fade-in-up delay-150 opacity-0">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-[#06B6D4] transition mb-6 text-sm">
            <ChevronRight size={18} className="rotate-180 mr-1" /> {t('backToBlog')}
          </button>

          {isTranslatingContent ? (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden p-10 flex items-center justify-center min-h-[200px]">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Translating article...</span>
              </div>
            </div>
          ) : (
            <article
              className="bg-white rounded-2xl shadow-lg overflow-hidden p-10 prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: displayContent || getSafeBlogContent(post.content) }}
            />
          )}
        </div>
      </div>
    </>
  );
};


export default BlogPostPage;

