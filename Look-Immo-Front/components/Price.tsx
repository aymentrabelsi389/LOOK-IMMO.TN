import React, { useEffect, useState } from 'react';
import { useCurrencyStore } from '../stores/useCurrencyStore';

const Price = ({ amount, priceType, className = '' }: { amount: number; priceType?: 'total' | 'per_m2'; className?: string }) => {
  const { currency, rates } = useCurrencyStore();
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsUpdating(true);
    const timeout = setTimeout(() => setIsUpdating(false), 150);
    return () => clearTimeout(timeout);
  }, [amount, currency]);

  const rate = rates[currency];
  const converted = Math.round(amount * rate);
  const formattedNumber = converted.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const getSymbol = (c: string) => {
    if (c === 'TND') return 'DT';
    if (c === 'EUR') return '€';
    if (c === 'USD') return '$';
    return c;
  };
  const curSymbol = getSymbol(currency);
  const isPrefix = currency === 'USD';

  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap transition-opacity duration-300 font-serif tracking-wide ${isUpdating ? 'opacity-50' : 'opacity-100'} ${className}`}
      data-price-base={amount}
      style={{ fontFamily: "'Playfair Display', serif" }}
    >
      {isPrefix && (
        <span className="font-sans font-medium mr-1 tracking-normal text-[0.7em]" style={{ fontFamily: 'Inter, sans-serif' }}>
          {curSymbol}
        </span>
      )}
      <span className="font-semibold">{formattedNumber}</span>
      {!isPrefix && (
        <span className="ml-1.5 whitespace-nowrap text-[0.7em] font-medium">
          {curSymbol}
          {priceType === 'per_m2' ? ' / m²' : ''}
        </span>
      )}
    </span>
  );
};

export default Price;
