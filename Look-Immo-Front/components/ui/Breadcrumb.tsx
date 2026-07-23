import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Accessible breadcrumb navigation component.
 * The last item is treated as the current page (no link, aria-current="page").
 */
const Breadcrumb = ({ items, className = '' }: BreadcrumbProps) => {
  return (
    <nav aria-label="breadcrumb" className={className}>
      <ol
        className="flex flex-wrap items-center gap-1 text-sm"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const position = index + 1;

          return (
            <li
              key={index}
              className="flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {/* Separator — not shown before the first crumb */}
              {index > 0 && (
                <ChevronRight
                  size={14}
                  className="text-gray-400 flex-shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                /* Current page — not a link */
                <span
                  className="text-brand-dark font-semibold truncate max-w-[200px] sm:max-w-xs md:max-w-sm"
                  aria-current="page"
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : (
                /* Ancestor crumb — clickable link */
                <Link
                  to={item.href!}
                  className="flex items-center gap-1 text-brand-grey hover:text-brand-teal transition-colors duration-150 whitespace-nowrap"
                  itemProp="item"
                >
                  {index === 0 && (
                    <Home size={13} className="flex-shrink-0" aria-hidden="true" />
                  )}
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}

              {/* Microdata position */}
              <meta itemProp="position" content={String(position)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
