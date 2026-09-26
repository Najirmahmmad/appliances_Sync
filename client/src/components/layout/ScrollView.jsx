import React from 'react';

/**
 * ScrollView
 *
 * A Web-only equivalent to React Native's ScrollView.
 * This sets `overflow-y-auto` and `overscroll-y-contain` so that inner content
 * scrolls smoothly, feeling like a native Android/iOS scrolling container.
 */
const ScrollView = ({ 
    children, 
    horizontal = false,
    className = '',
    style = {},
    ...rest 
}) => {
    return (
        <div 
            className={`flex-1 w-full ${horizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto overflow-x-hidden'} overscroll-contain ${className}`}
            style={{ WebkitOverflowScrolling: 'touch', ...style }}
            {...rest}
        >
            {children}
        </div>
    );
};

export default ScrollView;
