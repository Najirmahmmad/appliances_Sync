import React from 'react';
import { Loader2, FileText } from 'lucide-react';

const ResponsiveTable = ({
    columns,
    data,
    loading,
    emptyMessage = "No records found",
    emptyIcon: EmptyIcon = FileText,
    keyField = "id", // Field to use as unique key
    mobileCardRender, // Optional custom render function for mobile cards
    showRecordCount = true
}) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-center p-12 min-h-[200px]">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="text-center p-12 text-gray-500 min-h-[200px] flex flex-col items-center justify-center">
                    <EmptyIcon className="w-12 h-12 text-gray-300 mb-3" />
                    {emptyMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
                {data.map((row, rowIndex) => (
                    <div key={row[keyField] || rowIndex} className="p-4">
                        {mobileCardRender ? (
                            mobileCardRender(row, rowIndex)
                        ) : (
                            // Default mobile card layout - show first 3 columns
                            <div className="space-y-2">
                                {columns.slice(0, 3).map((col, colIndex) => (
                                    <div key={colIndex} className="flex justify-between items-start">
                                        <span className="text-xs text-gray-500">{col.header}:</span>
                                        <span className="text-sm text-gray-800 text-right ml-2">
                                            {col.render ? col.render(row) : (row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '-')}
                                        </span>
                                    </div>
                                ))}
                                {columns.length > 3 && (
                                    <div className="pt-2 border-t border-gray-100">
                                        {columns.slice(3).map((col, colIndex) => (
                                            <div key={colIndex} className="flex justify-between items-start py-1">
                                                <span className="text-xs text-gray-500">{col.header}:</span>
                                                <span className="text-sm text-gray-800 text-right ml-2">
                                                    {col.render ? col.render(row) : (row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '-')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`py-3 px-4 text-sm font-semibold text-gray-700 whitespace-nowrap ${col.className || ''} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    style={col.style}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, rowIndex) => (
                            <tr key={row[keyField] || rowIndex} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`py-3 px-4 text-sm text-gray-800 ${col.className || ''} ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    >
                                        {col.render ? col.render(row) : (row[col.field] !== undefined && row[col.field] !== null ? row[col.field] : '-')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showRecordCount && !loading && data.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
                    Showing {data.length} record{data.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

export default ResponsiveTable;
