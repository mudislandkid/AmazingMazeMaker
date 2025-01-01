// Shape definitions and utilities
export const SHAPES = {
    square: {
        getPath: (width, height) => ({
            points: [
                [0, 0],
                [width, 0],
                [width, height],
                [0, height]
            ]
        })
    },

    circle: {
        getPath: (width, height) => {
            const points = [];
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2;
            const segments = 64; // Number of segments to approximate circle

            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                points.push([
                    centerX + radius * Math.cos(angle),
                    centerY + radius * Math.sin(angle)
                ]);
            }

            return { points };
        }
    },

    heart: {
        getPath: (width, height) => {
            const points = [];
            const scale = Math.min(width, height);
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Heart curve parameters
            for (let angle = 0; angle <= 2 * Math.PI; angle += 0.1) {
                const x = 16 * Math.pow(Math.sin(angle), 3);
                const y = 13 * Math.cos(angle) - 
                         5 * Math.cos(2 * angle) - 
                         2 * Math.cos(3 * angle) - 
                         Math.cos(4 * angle);
                
                points.push([
                    centerX + (x * scale / 32),
                    centerY - (y * scale / 32)
                ]);
            }

            return { points };
        }
    },

    star: {
        getPath: (width, height) => {
            const points = [];
            const centerX = width / 2;
            const centerY = height / 2;
            const outerRadius = Math.min(width, height) / 2;
            const innerRadius = outerRadius * 0.4;
            const spikes = 5;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i / (spikes * 2)) * Math.PI * 2;
                points.push([
                    centerX + radius * Math.cos(angle - Math.PI / 2),
                    centerY + radius * Math.sin(angle - Math.PI / 2)
                ]);
            }

            return { points };
        }
    },

    hexagon: {
        getPath: (width, height) => {
            const points = [];
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2;
            const sides = 6;

            for (let i = 0; i <= sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                points.push([
                    centerX + radius * Math.cos(angle),
                    centerY + radius * Math.sin(angle)
                ]);
            }

            return { points };
        }
    }
};

// Helper function to scale points to fit the grid
export function scalePoints(points, width, height) {
    const minX = Math.min(...points.map(p => p[0]));
    const maxX = Math.max(...points.map(p => p[0]));
    const minY = Math.min(...points.map(p => p[1]));
    const maxY = Math.max(...points.map(p => p[1]));

    const scaleX = width / (maxX - minX);
    const scaleY = height / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    return points.map(([x, y]) => [
        (x - minX) * scale,
        (y - minY) * scale
    ]);
}

// Helper function to check if a point is inside a polygon
export function isPointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0], yi = points[i][1];
        const xj = points[j][0], yj = points[j][1];
        
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
} 