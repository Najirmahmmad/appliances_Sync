import React from 'react';

/**
 * SafeAreaView
 *
 * A Web-only equivalent to React Native's SafeAreaView for Capacitor.
 * Uses CSS environment variables (env(safe-area-inset-*)) to pad content 
 * so it avoids rendering under notches, status bars, and navigation bars.
 * 
 * Be sure to set `<meta name="viewport" content="... viewport-fit=cover" />` in index.html.
 */
const SafeAreaView = ({ 
    children, 
    edges = ['top', 'bottom', 'left', 'right'], 
    className = '',
    style = {},
    ...rest 
}) => {
    
    // Construct inline styles for requested edges dynamically
    const safeStyle = { ...style };
    
    if (edges.includes('top')) {
        // Fallback to 0px if the variable is not supported
        safeStyle.paddingTop = 'env(safe-area-inset-top, 0px)';
    }
    if (edges.includes('bottom')) {
        safeStyle.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
    }
    if (edges.includes('left')) {
        safeStyle.paddingLeft = 'env(safe-area-inset-left, 0px)';
    }
    if (edges.includes('right')) {
        safeStyle.paddingRight = 'env(safe-area-inset-right, 0px)';
    }

    return (
        <div 
            className={`w-full flex-1 flex flex-col ${className}`} 
            style={safeStyle}
            {...rest}
        >
            {children}
        </div>
    );
};

export default SafeAreaView;
