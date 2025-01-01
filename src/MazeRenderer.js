import { THEMES } from './utils/themes.js';

export default class MazeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.currentTheme = THEMES.classic;
    }

    setTheme(themeName) {
        this.currentTheme = THEMES[themeName];
    }

    async render(maze, style = 'classic', showSolution = false) {
        const cellSize = Math.min(
            (this.canvas.width - 40) / maze.width,
            (this.canvas.height - 40) / maze.height
        );
        const offsetX = (this.canvas.width - (maze.width * cellSize)) / 2;
        const offsetY = (this.canvas.height - (maze.height * cellSize)) / 2;

        // Clear canvas and set background
        this.ctx.fillStyle = this.currentTheme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Set wall style
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;

        // Draw maze cells
        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[y][x];
                if (cell.inShape) {
                    const cellX = offsetX + (x * cellSize);
                    const cellY = offsetY + (y * cellSize);
                    this.drawCell(cell, cellX, cellY, cellSize);
                }
            }
        }

        // Draw entry/exit points
        if (maze.entryPoints.length > 0) {
            for (const point of maze.entryPoints) {
                const x = offsetX + point.x * cellSize;
                const y = offsetY + point.y * cellSize;
                this.drawFlag(x, y, cellSize);  // Pass full cellSize
            }
        }

        if (maze.exitPoints.length > 0) {
            for (const point of maze.exitPoints) {
                const x = offsetX + point.x * cellSize;
                const y = offsetY + point.y * cellSize;
                this.drawTrophy(x, y, cellSize);  // Pass full cellSize
            }
        }

        // Draw solution if requested
        if (showSolution && maze.solution && maze.solution.length > 0) {
            await this.drawSolution(maze, cellSize, offsetX, offsetY);
        }

        if (maze.validationPath && maze.validationPath.length > 0) {
            this.ctx.strokeStyle = '#4CAF50';  // Green color for validation
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();

            for (let i = 0; i < maze.validationPath.length; i++) {
                const point = maze.validationPath[i];
                const x = offsetX + point.x * cellSize + cellSize / 2;
                const y = offsetY + point.y * cellSize + cellSize / 2;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }

    drawCell(cell, x, y, cellSize) {
        if (!cell.inShape) return;

        this.ctx.beginPath();
        if (cell.walls.top) {
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + cellSize, y);
        }
        if (cell.walls.right) {
            this.ctx.moveTo(x + cellSize, y);
            this.ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (cell.walls.bottom) {
            this.ctx.moveTo(x, y + cellSize);
            this.ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (cell.walls.left) {
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x, y + cellSize);
        }
        this.ctx.stroke();
    }

    async drawSolution(maze, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = this.currentTheme.solution;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        for (let i = 0; i < maze.solution.length; i++) {
            const point = maze.solution[i];
            const x = offsetX + point.x * cellSize + cellSize / 2;
            const y = offsetY + point.y * cellSize + cellSize / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
    }

    // Helper method to clear the canvas
    clear() {
        this.ctx.fillStyle = this.currentTheme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Method to get canvas data for export
    getCanvasData(type = 'image/jpeg', quality = 0.8) {
        return this.canvas.toDataURL(type, quality);
    }

    drawFlag(x, y, cellSize) {
        this.ctx.save();
        this.ctx.fillStyle = '#00ff00';  // Ensure flag is green
        
        const size = cellSize * 0.8;
        const margin = cellSize * 0.1;
        
        // Draw flag pole
        this.ctx.fillRect(
            x + margin + size/4, 
            y + margin, 
            size/8, 
            size
        );
        
        // Draw flag
        this.ctx.beginPath();
        this.ctx.moveTo(x + margin + size/4 + size/8, y + margin);
        this.ctx.lineTo(x + margin + size, y + margin + size/3);
        this.ctx.lineTo(x + margin + size/4 + size/8, y + margin + size/2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawTrophy(x, y, cellSize) {
        this.ctx.save();
        
        const size = cellSize * 0.8;
        const margin = cellSize * 0.1;
        const x0 = x + margin;
        const y0 = y + margin;
        const points = 5;  // 5-pointed star
        const outerRadius = size/2;
        const innerRadius = outerRadius * 0.4;

        // Star colors
        const goldGradient = this.ctx.createLinearGradient(x0, y0, x0 + size, y0 + size);
        goldGradient.addColorStop(0, '#FFD700');   // Gold
        goldGradient.addColorStop(1, '#FFA500');   // Orange

        this.ctx.fillStyle = goldGradient;
        this.ctx.strokeStyle = '#DAA520';  // Goldenrod
        this.ctx.lineWidth = 2;

        // Draw star
        this.ctx.beginPath();
        this.ctx.translate(x0 + size/2, y0 + size/2);

        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / points;
            if (i === 0) {
                this.ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
            } else {
                this.ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Add shine effect
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.moveTo(-outerRadius * 0.3, -outerRadius * 0.3);
        this.ctx.lineTo(outerRadius * 0.2, outerRadius * 0.2);
        this.ctx.stroke();

        this.ctx.restore();
    }
} 