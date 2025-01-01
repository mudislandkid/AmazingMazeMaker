import { SHAPES } from './utils/shapes.js';

export default class MazeGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.shape = 'square';
        this.entrances = 1;
        this.entryPoints = [];
        this.exitPoints = [];
        this.animationSpeed = 100;
        this.animationCallback = null;
        this.solution = [];
        this.validationPath = null;
    }

    initializeGrid(shape = 'square') {
        this.shape = shape;
        this.grid = [];
        const shapePath = SHAPES[shape].getPath(this.width, this.height);
        
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                const isInShape = this.isPointInShape(x, y, shapePath.points);
                this.grid[y][x] = {
                    visited: !isInShape,
                    walls: { top: true, right: true, bottom: true, left: true },
                    inShape: isInShape
                };
            }
        }
    }

    isPointInShape(x, y, points) {
        const scaledX = (x / this.width) * this.width;
        const scaledY = (y / this.height) * this.height;
        
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i][0], yi = points[i][1];
            const xj = points[j][0], yj = points[j][1];
            
            const intersect = ((yi > scaledY) !== (yj > scaledY))
                && (scaledX < (xj - xi) * (scaledY - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    async generateMaze(animate = false) {
        let attempts = 0;
        const maxAttempts = 5;
        let success = false;

        while (!success && attempts < maxAttempts) {
            this.solution = [];
            
            if (this.entrances === 1) {
                // For single entrance, start from center
                const centerX = Math.floor(this.width / 2);
                const centerY = Math.floor(this.height / 2);
                
                // Place exit (trophy) at center
                this.exitPoints = [{ x: centerX, y: centerY }];
                
                // Select random entry point from edges
                this.entryPoints = this.selectEntryPoints(1);
                this.createEntranceGaps();
                
                // Generate maze from center
                await this.generateFromPoint(centerX, centerY, animate);
            } else {
                const startPoints = this.selectEntryExitPoints();
                this.createEntranceGaps();
                
                for (let i = 0; i < startPoints.length; i++) {
                    await this.generateFromPoint(startPoints[i].x, startPoints[i].y, animate);
                }

                if (this.entrances > 1) {
                    await this.connectRegions(animate);
                }
            }

            if (this.validateMaze()) {
                success = true;
            } else {
                attempts++;
                this.initializeGrid(this.shape);
            }
        }

        if (!success) {
            throw new Error('Failed to generate a valid maze after multiple attempts');
        }

        return this.grid;
    }

    async generateFromPoint(startX, startY, animate) {
        const stack = [];
        let current = { x: startX, y: startY };
        this.grid[current.y][current.x].visited = true;

        stack.push(current);

        while (stack.length > 0) {
            current = stack[stack.length - 1];
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length === 0) {
                stack.pop();
                if (animate) {
                    await this.animateStep(current);
                }
                continue;
            }

            const next = neighbors[Math.floor(Math.random() * neighbors.length)];
            this.removeWalls(current, next);
            this.grid[next.y][next.x].visited = true;
            stack.push(next);

            if (animate) {
                await this.animateStep(next);
            }
        }
    }

    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },  // top
            { x: 1, y: 0 },   // right
            { x: 0, y: 1 },   // bottom
            { x: -1, y: 0 }   // left
        ];

        for (const dir of directions) {
            const newX = cell.x + dir.x;
            const newY = cell.y + dir.y;

            if (newX >= 0 && newX < this.width && 
                newY >= 0 && newY < this.height && 
                this.grid[newY][newX].inShape && 
                !this.grid[newY][newX].visited) {
                neighbors.push({ x: newX, y: newY });
            }
        }

        return neighbors;
    }

    removeWalls(current, next) {
        const dx = next.x - current.x;
        const dy = next.y - current.y;

        if (dx === 1) {
            this.grid[current.y][current.x].walls.right = false;
            this.grid[next.y][next.x].walls.left = false;
        } else if (dx === -1) {
            this.grid[current.y][current.x].walls.left = false;
            this.grid[next.y][next.x].walls.right = false;
        }

        if (dy === 1) {
            this.grid[current.y][current.x].walls.bottom = false;
            this.grid[next.y][next.x].walls.top = false;
        } else if (dy === -1) {
            this.grid[current.y][current.x].walls.top = false;
            this.grid[next.y][next.x].walls.bottom = false;
        }
    }

    async animateStep(cell) {
        if (this.animationCallback) {
            await this.animationCallback(this.grid, cell);
            const delay = Math.max(1, 50 - (this.animationSpeed / 2));
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    async validateMaze() {
        // Reset validation path
        this.validationPath = [];
        
        // Start from first entry point (or exit point if only one entrance)
        const start = this.entrances === 1 ? this.exitPoints[0] : this.entryPoints[0];
        const end = this.entrances === 1 ? this.entryPoints[0] : this.exitPoints[0];
        
        // Create visited array
        const visited = Array(this.height).fill().map(() => 
            Array(this.width).fill(false)
        );

        // Find path using DFS with animation
        const path = await this.findPathWithAnimation(start, end, visited);
        
        // Store the solution but clear the validation path
        if (path) {
            this.solution = path;
            this.validationPath = null;  // Clear validation path after finding solution
        }
        
        return path !== null;
    }

    async findPathWithAnimation(start, end, visited) {
        const stack = [{
            x: start.x,
            y: start.y,
            path: [{x: start.x, y: start.y}]
        }];
        
        while (stack.length > 0) {
            const current = stack.pop();
            const {x, y, path} = current;
            
            if (x === end.x && y === end.y) {
                this.solution = path;
                return path;
            }
            
            if (!visited[y][x]) {
                visited[y][x] = true;
                
                // Animate current cell being checked
                if (this.animationCallback) {
                    this.validationPath = path;
                    await this.animationCallback(this.grid, {x, y});
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
                
                // Check all four directions
                const directions = [
                    {dx: 0, dy: -1, wall: 'top'},
                    {dx: 1, dy: 0, wall: 'right'},
                    {dx: 0, dy: 1, wall: 'bottom'},
                    {dx: -1, dy: 0, wall: 'left'}
                ];
                
                for (const dir of directions) {
                    const newX = x + dir.dx;
                    const newY = y + dir.dy;
                    
                    if (newX >= 0 && newX < this.width &&
                        newY >= 0 && newY < this.height &&
                        this.grid[y][x].inShape &&
                        !this.grid[y][x].walls[dir.wall]) {
                        
                        stack.push({
                            x: newX,
                            y: newY,
                            path: [...path, {x: newX, y: newY}]
                        });
                    }
                }
            }
        }
        
        return null;
    }

    findSolution() {
        return this.solution || [];  // Return stored solution or empty array
    }

    selectEntryExitPoints() {
        this.entryPoints = [];
        this.exitPoints = [];
        const points = [];

        // Find valid edge cells
        const edgeCells = [];
        
        // Check top and bottom edges
        for (let x = 0; x < this.width; x++) {
            if (this.grid[0][x].inShape) {
                edgeCells.push({ x, y: 0, edge: 'top' });
            }
            if (this.grid[this.height - 1][x].inShape) {
                edgeCells.push({ x, y: this.height - 1, edge: 'bottom' });
            }
        }

        // Check left and right edges
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y][0].inShape) {
                edgeCells.push({ x: 0, y, edge: 'left' });
            }
            if (this.grid[y][this.width - 1].inShape) {
                edgeCells.push({ x: this.width - 1, y, edge: 'right' });
            }
        }

        // Randomly select entry/exit points based on number of entrances
        for (let i = 0; i < this.entrances; i++) {
            if (edgeCells.length === 0) break;
            
            const index = Math.floor(Math.random() * edgeCells.length);
            const point = edgeCells.splice(index, 1)[0];
            
            if (i === 0) {
                this.exitPoints.push(point);
            } else {
                this.entryPoints.push(point);
            }
            points.push(point);
        }

        return points;
    }

    createEntranceGaps() {
        // Create gaps in walls for entry/exit points
        for (const point of this.entryPoints.concat(this.exitPoints)) {
            const cell = this.grid[point.y][point.x];
            switch (point.edge) {
                case 'top':
                    cell.walls.top = false;
                    break;
                case 'right':
                    cell.walls.right = false;
                    break;
                case 'bottom':
                    cell.walls.bottom = false;
                    break;
                case 'left':
                    cell.walls.left = false;
                    break;
            }
        }
    }

    selectEntryPoints(count) {
        const edgeCells = [];
        
        // Check top and bottom edges
        for (let x = 0; x < this.width; x++) {
            if (this.grid[0][x].inShape) {
                edgeCells.push({ x, y: 0, edge: 'top' });
            }
            if (this.grid[this.height - 1][x].inShape) {
                edgeCells.push({ x, y: this.height - 1, edge: 'bottom' });
            }
        }

        // Check left and right edges
        for (let y = 0; y < this.height; y++) {
            if (this.grid[y][0].inShape) {
                edgeCells.push({ x: 0, y, edge: 'left' });
            }
            if (this.grid[y][this.width - 1].inShape) {
                edgeCells.push({ x: this.width - 1, y, edge: 'right' });
            }
        }

        const selectedPoints = [];
        for (let i = 0; i < count; i++) {
            if (edgeCells.length === 0) break;
            const index = Math.floor(Math.random() * edgeCells.length);
            selectedPoints.push(edgeCells.splice(index, 1)[0]);
        }

        return selectedPoints;
    }
} 