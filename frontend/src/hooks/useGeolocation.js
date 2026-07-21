import { useState, useCallback } from 'react';
import { useToastStore } from '../store/useToastStore';

/**
 * Custom hook to grab current coordinates from browser Geolocation API safely.
 * @returns {object} Coordinates, error status, loading indicator, and capture trigger.
 */
export function useGeolocation() {
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToastStore();

  const getCoordinates = useCallback(() => {
    if (!navigator.geolocation) {
      const msg = 'Geolocation is not supported by your browser.';
      setError(msg);
      showToast(msg, 'error');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoordinates(coords);
        setLoading(false);
        showToast('Location coordinates updated!', 'success');
      },
      (err) => {
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) {
          msg = 'Location permission denied by user.';
        } else if (err.code === 2) {
          msg = 'Location unavailable or offline.';
        }
        setError(msg);
        setLoading(false);
        showToast(msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [showToast]);

  return {
    ...coordinates,
    error,
    loading,
    getCoordinates,
  };
}
