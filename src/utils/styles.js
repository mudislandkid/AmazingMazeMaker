import { SHAPES } from './shapes.js';

// Maze style definitions and rendering logic
export const STYLES = {
    classic: {
        name: 'Classic Grid',
        initializeGrid: (maze, shape) => {
            maze.shape = shape;
            maze.grid = [];
            const shapePath = SHAPES[shape].getPath(maze.width, maze.height);
            
            for (let y = 0; y < maze.height; y++) {
                maze.grid[y] = [];
                for (let x = 0; x < maze.width; x++) {
                    const isInShape = maze.isPointInShape(x, y, shapePath.points);
                    maze.grid[y][x] = {
                        visited: !isInShape,
                        walls: { top: true, right: true, bottom: true, left: true },
                        inShape: isInShape
                    };
                }
            }
        },
        
        renderCell: (ctx, cell, x, y, cellSize) => {
            if (!cell.inShape) return;

            ctx.beginPath();
            if (cell.walls.top) {
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellSize, y);
            }
            if (cell.walls.right) {
                ctx.moveTo(x + cellSize, y);
                ctx.lineTo(x + cellSize, y + cellSize);
            }
            if (cell.walls.bottom) {
                ctx.moveTo(x, y + cellSize);
                ctx.lineTo(x + cellSize, y + cellSize);
            }
            if (cell.walls.left) {
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + cellSize);
            }
            ctx.stroke();
        }
    },

    circular: {
        name: 'Circular Grid',
        initializeGrid: (maze) => {
            // Force circle shape for circular grid
            maze.shape = 'circle';
            maze.grid = [];
            
            for (let y = 0; y < maze.height; y++) {
                maze.grid[y] = [];
                const cellsInRing = Math.floor(maze.width + (y * 4));
                
                for (let x = 0; x < cellsInRing; x++) {
                    maze.grid[y][x] = {
                        visited: false,
                        walls: { top: true, right: true, bottom: true, left: true },
                        inShape: true
                    };
                }
            }
        },

        renderCell: (ctx, cell, x, y, cellSize, params) => {
            if (!cell.inShape) return;

            const { row, col, totalRows, totalCols, canvasWidth, canvasHeight } = params;
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            
            // Calculate radii for inner and outer arcs
            const maxRadius = Math.min(canvasWidth, canvasHeight) / 2 - 20;
            const ringWidth = maxRadius / totalRows;
            const innerRadius = row * ringWidth;
            const outerRadius = (row + 1) * ringWidth;
            
            // Calculate angles for cell
            const anglePerCell = (2 * Math.PI) / (totalCols + (row * 4));
            const startAngle = col * anglePerCell;
            const endAngle = (col + 1) * anglePerCell;

            ctx.beginPath();

            // Draw circular walls
            if (cell.walls.top) {
                ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            }
            if (cell.walls.bottom) {
                ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
            }

            // Draw radial walls
            if (cell.walls.left) {
                ctx.moveTo(
                    centerX + innerRadius * Math.cos(startAngle),
                    centerY + innerRadius * Math.sin(startAngle)
                );
                ctx.lineTo(
                    centerX + outerRadius * Math.cos(startAngle),
                    centerY + outerRadius * Math.sin(startAngle)
                );
            }
            if (cell.walls.right) {
                ctx.moveTo(
                    centerX + innerRadius * Math.cos(endAngle),
                    centerY + innerRadius * Math.sin(endAngle)
                );
                ctx.lineTo(
                    centerX + outerRadius * Math.cos(endAngle),
                    centerY + outerRadius * Math.sin(endAngle)
                );
            }

            ctx.stroke();
        }
    }
};

// Helper function to get style configuration
export function getStyle(styleName) {
    return STYLES[styleName] || STYLES.classic;
} 