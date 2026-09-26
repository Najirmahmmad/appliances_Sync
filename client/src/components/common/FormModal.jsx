import React, { useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

const FormModal = ({
    isOpen,
    onClose,
    title,
    onSubmit, // Function to handle form submission
    loading = false,
    children,
    submitLabel = "Save",
    width = "max-w-lg" // Default width class for desktop
}) => {

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 backdrop-blur-sm transition-opacity">
            <div
                className={`bg-white shadow-2xl w-full h-full sm:h-auto sm:rounded-xl sm:max-h-[90vh] flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-200 ${width}`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0 bg-white sticky top-0 z-10">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 truncate pr-2">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
                    <form id="modal-form" onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
                        {children}
                    </form>
                </div>

                {/* Footer - Fixed at bottom on mobile */}
                <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50 sm:rounded-b-xl flex flex-col-reverse sm:flex-row gap-3 sm:justify-end flex-shrink-0 sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 w-full sm:w-auto border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="modal-form"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 w-full sm:w-auto bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {loading ? 'Saving...' : submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FormModal;
