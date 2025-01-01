// Theme definitions
export const THEMES = {
    classic: {
        background: '#ffffff',
        walls: '#000000',
        solution: '#ff0000'
    },
    
    forest: {
        background: '#e8f5e9',  // Light mint green
        walls: '#2e7d32',      // Forest green
        solution: '#ff6d00'     // Orange for contrast
    },

    ocean: {
        background: '#e3f2fd',  // Light blue
        walls: '#1565c0',      // Deep blue
        solution: '#ffeb3b'     // Yellow for contrast
    },

    sunset: {
        background: '#fff3e0',  // Light orange
        walls: '#ff5722',      // Deep orange
        solution: '#7c4dff'     // Purple for contrast
    },

    neon: {
        background: '#000000',  // Black
        walls: '#00ff00',      // Bright green
        solution: '#ff00ff'     // Magenta
    }
};

// Helper function to get theme colors
export function getThemeColors(themeName) {
    return THEMES[themeName] || THEMES.classic;
}

// Helper function to apply theme to canvas context
export function applyTheme(ctx, themeName) {
    const theme = getThemeColors(themeName);
    ctx.strokeStyle = theme.walls;
    ctx.fillStyle = theme.background;
    return theme;
} 