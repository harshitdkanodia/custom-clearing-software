import { useState, useEffect, useRef } from 'react';
import api from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Plus, Loader2 } from 'lucide-react';

export default function CustomerSearchDropdown({ onSelect, onAddNew }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleSearch(value) {
        setQuery(value);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (value.length < 1) {
            setResults([]);
            setOpen(false);
            return;
        }

        timeoutRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get(`/customers/search?q=${encodeURIComponent(value)}`);
                setResults(res.data.data);
                setOpen(true);
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        }, 300);
    }

    function handleSelect(customer) {
        setQuery(customer.customerName);
        setOpen(false);
        onSelect?.(customer);
    }

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    value={query}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search customer by name, IEC, or GST..."
                    className="pl-9 pr-9"
                    onFocus={() => results.length > 0 && setOpen(true)}
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
            </div>

            {open && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {results.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">No customers found</div>
                    ) : (
                        results.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelect(c)}
                                className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b last:border-0"
                            >
                                <div className="font-medium text-sm text-gray-900">{c.customerName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    IEC: {c.iecCode} | GST: {c.gstNumber}
                                </div>
                            </button>
                        ))
                    )}
                    {onAddNew && (
                        <button
                            type="button"
                            onClick={() => { setOpen(false); onAddNew(); }}
                            className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition-colors flex items-center gap-2 text-blue-600 text-sm font-medium border-t"
                        >
                            <Plus className="h-4 w-4" /> Add New Customer
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
