import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onAddressParsed,
  placeholder = "Enter property address..."
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  // Parse address using Google Geocoding API
  const parseAddress = async (address) => {
    try {
      // Get API key from backend function (avoid exposing key in frontend)
      const response = await fetch(
        `/functions/getGoogleMapsKey`
      ).catch(() => ({ json: async () => ({ key: '' }) }));
      const { key: mapsApiKey } = await response.json();
      
      if (!mapsApiKey) {
        console.error('Google Maps API key not available');
        return;
      }
      
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${mapsApiKey}`
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
          if (component.types.includes('locality')) {
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

        const fullAddress = result.formatted_address;
        const street = `${components.street_number || ''} ${components.street_name || ''}`.trim();

        // Call the parent's callback with parsed address
        onAddressParsed({
          street: street,
          city: components.city || '',
          state: components.state || '',
          zip: components.zip || '',
          county: components.county || '',
          country: components.country || 'USA',
          fullAddress: fullAddress,
        });

        onChange(fullAddress);
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Address parsing error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch suggestions as user types
  const handleInputChange = async (e) => {
    const val = e.target.value;
    onChange(val);

    if (val.length > 2) {
      setIsLoading(true);
      try {
        // Get API key from backend
        const keyResponse = await fetch(`/functions/getGoogleMapsKey`).catch(() => ({ json: async () => ({ key: '' }) }));
        const { key: mapsApiKey } = await keyResponse.json();
        
        if (!mapsApiKey) {
          console.error('Google Maps API key not available');
          setIsLoading(false);
          return;
        }
        
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(val)}&key=${mapsApiKey}&components=country:us`
        );
        const data = await response.json();

        if (data.predictions) {
          setSuggestions(data.predictions.slice(0, 5));
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.description);
    parseAddress(suggestion.description);
  };

  return (
    <div className="space-y-2 relative">
      <Label>Property Address</Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-9"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-0 flex items-start gap-2"
            >
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {suggestion.main_text}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}