import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPageSelect: (page: number) => void;
  /**
   * When true, click handlers call event.stopPropagation() before
   * invoking the callback. Needed when the pagination controls sit
   * inside another clickable element (e.g. a row) and must not
   * trigger that parent's click handler.
   */
  stopPropagation?: boolean;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onPageSelect,
  stopPropagation = false,
}: PaginationProps) => {
  const handleClick = (fn: () => void) => {
    if (stopPropagation) {
      return (e: React.MouseEvent) => {
        e.stopPropagation();
        fn();
      };
    }
    return () => fn();
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleClick(onPrev)}
        disabled={currentPage === 1}
        className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
      >
        <ChevronLeft size={16} />
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          key={page}
          onClick={handleClick(() => onPageSelect(page))}
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
        onClick={handleClick(onNext)}
        disabled={currentPage === totalPages}
        className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;
