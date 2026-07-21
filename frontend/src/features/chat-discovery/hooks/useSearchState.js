import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function useSearchState() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read raw parameters from URL search params (Problem 7 Single Source of Truth)
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const radius = parseInt(searchParams.get('radius') || '5', 10); // in km (default 5)
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;

  // Local volatile debouncing parameters
  const [debouncedQuery, setDebouncedQuery] = useState(q);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(q);
    }, 400); // 400ms typing debounce
    return () => clearTimeout(handler);
  }, [q]);

  const updateParams = (newParams) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    setSearchParams(nextParams, { replace: true });
  };

  return {
    q,
    category,
    radius,
    lat,
    lng,
    debouncedQuery,
    setQuery: (newQ) => updateParams({ q: newQ }),
    setCategory: (newCat) => updateParams({ category: newCat }),
    setRadius: (newRad) => updateParams({ radius: newRad }),
    setCoordinates: (newLat, newLng) => updateParams({ lat: newLat, lng: newLng }),
    clearSearch: () => setSearchParams(new URLSearchParams(), { replace: true }),
  };
}
