import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onAddressParsed,
  placeholder = "Enter property address...",
  label,
  className = ""
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch API key once on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await base44.functions.invoke('getGoogleMapsKey', {});
        if (response.data?.key) {
          setApiKey(response.data.key);
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      }
    };
    fetchApiKey();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Parse full address from place details
  const parseAddressFromPlace = async (placeId) => {
    if (!apiKey) return;
    
    setIsLoading(true);
    try {
      // Use Place Details API via a proxy or directly with CORS handling
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = {};

        result.address_components.forEach(component => {
          if (component.types.includes('street_number')) {
            components.street_number = component.long_name;
          }
          if (component.types.includes('route')) {
            components.street_name = component.long_name;
          }
          if (component.types.includes('locality') || component.types.includes('sublocality')) {
            components.city = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            components.state = component.short_name;
          }
          if (component.types.includes('postal_code')) {
            components.zip = component.long_name;
          }
          if (component.types.includes('administrative_area_level_2')) {
            components.county = component.long_name.replace(' County', '');
          }
          if (component.types.includes('country')) {
            components.country = component.long_name;
          }
        });

        const street = `${components.street_number || ''} ${components.street_name || ''}`.trim();
        const fullAddress = result.formatted_address;

        if (onAddressParsed) {
          onAddressParsed({
            street,
            city: components.city || '',
            state: components.state || '',
            zip: components.zip || '',
            county: components.county || '',
            country: components.country || 'USA',
            fullAddress,
            lat: result.geometry?.location?.lat,
            lng: result.geometry?.location?.lng,
          });
        }

        onChange(street || fullAddress);
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Address parsing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (inputValue) => {
    if (!apiKey || inputValue.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      // Google Places Autocomplete API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(inputValue)}&key=${apiKey}&components=country:us&types=address`
      );
      const data = await response.json();

      if (data.predictions && data.predictions.length > 0) {
        setSuggestions(data.predictions.slice(0, 5).map(pred => ({
          description: pred.description,
          placeId: pred.place_id,
          mainText: pred.structured_formatting?.main_text || pred.description.split(',')[0],
          secondaryText: pred.structured_formatting?.secondary_text || pred.description.split(',').slice(1).join(','),
        })));
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      // Fallback: just use the input value
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);

    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.description);
    parseAddressFromPlace(suggestion.placeId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          value={value || ''}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value && value.length >= 3 && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left p-3 hover:bg-blue-50 border-b last:border-b-0 flex items-start gap-2 transition-colors"
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {suggestion.mainText}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.secondaryText}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}