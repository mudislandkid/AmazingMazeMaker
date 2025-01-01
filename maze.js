let currentMaze = null;
let renderer = null;
let generateButton, difficultyInput, difficultyValue, shapeSelect, styleSelect, 
    themeSelect, sizeSelect, entrancesSelect, showSolutionButton, saveMazeButton, 
    loadMazeInput, loadMazeButton;

class MazeGenerator {
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

    initializeClassicGrid(shape) {
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

    initializeGrid(shape = 'square', style = 'classic') {
        this.shape = shape;
        this.style = style;

        // Force circle shape for spiral style
        if (style === 'spiral') {
            this.shape = 'circle';
            shape = 'circle';
        }

        // Initialize grid based on style
        switch (style) {
            case 'spiral':
                this.initializeSpiralGrid();
                break;
            case 'zigzag':
                this.initializeZigzagGrid();
                break;
            case 'honeycomb':
                this.initializeHoneycombGrid();
                break;
            default:
                this.initializeClassicGrid(shape);
        }
    }

    initializeSpiralGrid() {
        this.grid = [];
        const center = { x: Math.floor(this.width / 2), y: Math.floor(this.height / 2) };
        const maxRadius = Math.min(this.width, this.height) / 2 - 2;
        
        // Initialize empty grid
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = {
                    visited: true,
                    walls: { 
                        clockwise: true,     // Wall between this cell and next clockwise cell
                        outward: true,       // Wall between this cell and next ring outward
                    },
                    inShape: false,
                    ring: -1,               // Which ring the cell belongs to
                    segment: -1             // Position within the ring
                };
            }
        }

        // Create ring structure
        const numRings = Math.floor(maxRadius / 2);
        
        for (let ring = 0; ring < numRings; ring++) {
            // More segments in outer rings
            const numSegments = Math.max(16, Math.floor(2 * Math.PI * (ring + 1) * 2));
            
            for (let segment = 0; segment < numSegments; segment++) {
                const angle = (segment / numSegments) * 2 * Math.PI;
                const radius = (ring + 1) * 2;
                const x = Math.floor(center.x + radius * Math.cos(angle));
                const y = Math.floor(center.y + radius * Math.sin(angle));
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.grid[y][x].inShape = true;
                    this.grid[y][x].visited = false;
                    this.grid[y][x].ring = ring;
                    this.grid[y][x].segment = segment;
                }
            }
        }
    }

    initializeZigzagGrid() {
        this.grid = [];
        const pathWidth = 2;
        
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                const section = Math.floor(y / pathWidth);
                const isRightward = section % 2 === 0;
                const xOffset = isRightward ? x : (this.width - 1 - x);
                const isInPath = (y % pathWidth === 0) || 
                               (xOffset === 0) || 
                               (xOffset === this.width - 1);
                
                this.grid[y][x] = {
                    visited: !isInPath,
                    walls: { top: true, right: true, bottom: true, left: true },
                    inShape: isInPath
                };
            }
        }
    }

    initializeHoneycombGrid() {
        this.grid = [];
        const hexSize = Math.max(2, Math.floor(this.width / 8));
        
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                const xOffset = (y % 2) * (hexSize / 2);
                const xPos = x + xOffset;
                const isInHex = ((xPos % (hexSize * 2) < hexSize) && 
                               (y % (hexSize * 2) < hexSize)) ||
                               ((xPos + hexSize) % (hexSize * 2) < hexSize && 
                               (y + hexSize) % (hexSize * 2) < hexSize);
                
                this.grid[y][x] = {
                    visited: !isInHex,
                    walls: { top: true, right: true, bottom: true, left: true },
                    inShape: isInHex
                };
            }
        }
    }

    isPointInShape(x, y, points) {
        // Scale point coordinates to match shape coordinates
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
            const startPoints = this.selectEntryExitPoints();
            
            if (this.entrances === 1) {
                await this.generateFromPoint(this.exitPoints[0].x, this.exitPoints[0].y, animate);
            } else {
                for (let i = 0; i < startPoints.length; i++) {
                    await this.generateFromPoint(startPoints[i].x, startPoints[i].y, animate);
                }
            }

            if (this.entrances > 1) {
                await this.connectRegions(animate);
            }

            // Validate the maze
            if (this.validateMaze()) {
                success = true;
            } else {
                attempts++;
                // Reset the grid and try again
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

    async animateStep(cell) {
        if (this.animationCallback) {
            await this.animationCallback(this.grid, cell);
            // Convert speed (1-100) to delay (1-50ms)
            const delay = Math.max(1, 50 - (this.animationSpeed / 2));
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    selectEntryExitPoints() {
        this.entryPoints = [];
        this.exitPoints = [];
        
        switch (this.style) {
            case 'spiral':
                // For spiral, entry at outer edge, exit at center
                const center = this.findExactCenter();
                const outerPoint = this.findSpiralEntryPoint();
                if (center && outerPoint) {
                    this.entryPoints.push(outerPoint);
                    this.exitPoints.push(center);
                    this.createOuterWallGap(outerPoint);
                    return [center, outerPoint]; // Generate from center outward
                }
                break;

            case 'zigzag':
                // For zigzag, entry at top, exit at bottom
                const topPoint = { x: 1, y: 0, side: 'top' };
                const bottomPoint = { x: this.width - 2, y: this.height - 1, side: 'bottom' };
                if (this.grid[topPoint.y][topPoint.x].inShape && 
                    this.grid[bottomPoint.y][bottomPoint.x].inShape) {
                    this.entryPoints.push(topPoint);
                    this.exitPoints.push(bottomPoint);
                    this.createOuterWallGap(topPoint);
                    this.createOuterWallGap(bottomPoint);
                    return [bottomPoint, topPoint];
                }
                break;

            case 'honeycomb':
                // For honeycomb, find valid entry/exit points on opposite sides
                const leftPoint = this.findValidHoneycombPoint('left');
                const rightPoint = this.findValidHoneycombPoint('right');
                if (leftPoint && rightPoint) {
                    this.entryPoints.push(leftPoint);
                    this.exitPoints.push(rightPoint);
                    this.createOuterWallGap(leftPoint);
                    this.createOuterWallGap(rightPoint);
                    return [rightPoint, leftPoint];
                }
                break;

            default:
                // Classic grid behavior
                if (this.entrances === 1) {
                    const exit = this.findExactCenter();
                    const entry = this.findEdgeEntryPoint();
                    
                    if (entry && exit) {
                        this.entryPoints.push(entry);
                        this.exitPoints.push(exit);
                        this.createOuterWallGap(entry);
                        return [exit, entry];
                    }
                } else {
                    for (let i = 0; i < this.entrances / 2; i++) {
                        const entry = this.findEdgeEntryPoint();
                        const exit = this.findEdgeEntryPoint();
                        
                        if (entry && exit) {
                            this.entryPoints.push(entry);
                            this.exitPoints.push(exit);
                            this.createOuterWallGap(entry);
                            this.createOuterWallGap(exit);
                        }
                    }
                    return [...this.entryPoints, ...this.exitPoints];
                }
        }
        return [];
    }

    findEdgeEntryPoint() {
        const sides = ['top', 'right', 'bottom', 'left'];
        let attempts = 100;
        
        while (attempts > 0) {
            const side = sides[Math.floor(Math.random() * sides.length)];
            const point = this.findPointOnSide(side);
            
            if (point && this.grid[point.y][point.x].inShape) {
                point.side = side; // Store which side this point is on
                return point;
            }
            attempts--;
        }
        return null;
    }

    findPointOnSide(side) {
        let x, y;
        switch (side) {
            case 'top':
                x = Math.floor(Math.random() * (this.width - 2)) + 1;
                y = 0;
                break;
            case 'right':
                x = this.width - 1;
                y = Math.floor(Math.random() * (this.height - 2)) + 1;
                break;
            case 'bottom':
                x = Math.floor(Math.random() * (this.width - 2)) + 1;
                y = this.height - 1;
                break;
            case 'left':
                x = 0;
                y = Math.floor(Math.random() * (this.height - 2)) + 1;
                break;
        }
        return { x, y };
    }

    findExactCenter() {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        // Check center point and immediate neighbors
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (x >= 0 && x < this.width && y >= 0 && y < this.height && 
                    this.grid[y][x].inShape) {
                    return { x, y, side: 'center' };
                }
            }
        }
        return null;
    }

    createOuterWallGap(point) {
        if (!point) return;

        if (this.style === 'spiral') {
            if (point.side === 'outer') {
                // Remove outward wall for outer entry point
                this.grid[point.y][point.x].walls.outward = false;
            }
            // No need to create gap for center point
            return;
        }

        // Original wall gap logic for other styles
        if (point.side === 'top') {
            this.grid[point.y][point.x].walls.top = false;
        } else if (point.side === 'right') {
            this.grid[point.y][point.x].walls.right = false;
        } else if (point.side === 'bottom') {
            this.grid[point.y][point.x].walls.bottom = false;
        } else if (point.side === 'left') {
            this.grid[point.y][point.x].walls.left = false;
        }
    }

    findSolution() {
        if (this.validationPath) {
            this.solution = this.validationPath;
            return this.solution;
        }
        // Fallback to original A* pathfinding if no stored path
        return this.findPathAStar(this.entryPoints[0], this.exitPoints[0]);
    }

    findPathAStar(start, end) {
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        const getKey = (point) => `${point.x},${point.y}`;
        const heuristic = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        
        gScore.set(getKey(start), 0);
        fScore.set(getKey(start), heuristic(start, end));
        
        while (openSet.length > 0) {
            const current = openSet.reduce((a, b) => 
                (fScore.get(getKey(a)) || Infinity) < (fScore.get(getKey(b)) || Infinity) ? a : b
            );
            
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }
            
            openSet.splice(openSet.indexOf(current), 1);
            const neighbors = this.getAccessibleNeighbors(current);
            
            for (const neighbor of neighbors) {
                const tentativeGScore = (gScore.get(getKey(current)) || 0) + 1;
                
                if (tentativeGScore < (gScore.get(getKey(neighbor)) || Infinity)) {
                    cameFrom.set(getKey(neighbor), current);
                    gScore.set(getKey(neighbor), tentativeGScore);
                    fScore.set(getKey(neighbor), tentativeGScore + heuristic(neighbor, end));
                    
                    if (!openSet.find(p => p.x === neighbor.x && p.y === neighbor.y)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }
        
        return null;
    }

    getAccessibleNeighbors(cell) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1, wall: 'top' },
            { x: 1, y: 0, wall: 'right' },
            { x: 0, y: 1, wall: 'bottom' },
            { x: -1, y: 0, wall: 'left' }
        ];
        
        for (const dir of directions) {
            const newX = cell.x + dir.x;
            const newY = cell.y + dir.y;
            
            if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
                // Check if there's no wall between cells
                const currentCell = this.grid[cell.y][cell.x];
                if (!currentCell.walls[dir.wall]) {
                    neighbors.push({ x: newX, y: newY });
                }
            }
        }
        
        return neighbors;
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        const getKey = (point) => `${point.x},${point.y}`;
        
        while (cameFrom.has(getKey(current))) {
            current = cameFrom.get(getKey(current));
            path.unshift(current);
        }
        
        return path;
    }

    getUnvisitedNeighbors(cell) {
        if (this.style === 'spiral') {
            const neighbors = [];
            const x = cell.x;
            const y = cell.y;
            const currentRing = this.grid[y][x].ring;
            const currentSegment = this.grid[y][x].segment;
            
            // Function to check if a point is valid and unvisited
            const isValidNeighbor = (px, py) => {
                return px >= 0 && px < this.width && 
                       py >= 0 && py < this.height && 
                       this.grid[py][px].inShape && 
                       !this.grid[py][px].visited;
            };

            // Get cells in same ring (clockwise and counterclockwise)
            const radius = (currentRing + 1) * 2;
            const numSegments = Math.max(8, Math.floor(2 * Math.PI * radius / 2));
            const nextSegment = (currentSegment + 1) % numSegments;
            const prevSegment = (currentSegment - 1 + numSegments) % numSegments;
            
            // Calculate neighbor positions
            const center = { 
                x: Math.floor(this.width / 2), 
                y: Math.floor(this.height / 2) 
            };

            // Clockwise neighbor
            const clockAngle = (nextSegment / numSegments) * 2 * Math.PI;
            const clockX = Math.floor(center.x + radius * Math.cos(clockAngle));
            const clockY = Math.floor(center.y + radius * Math.sin(clockAngle));
            if (isValidNeighbor(clockX, clockY)) {
                neighbors.push({ x: clockX, y: clockY });
            }

            // Counter-clockwise neighbor
            const counterAngle = (prevSegment / numSegments) * 2 * Math.PI;
            const counterX = Math.floor(center.x + radius * Math.cos(counterAngle));
            const counterY = Math.floor(center.y + radius * Math.sin(counterAngle));
            if (isValidNeighbor(counterX, counterY)) {
                neighbors.push({ x: counterX, y: counterY });
            }

            // Inner ring neighbor
            if (currentRing > 0) {
                const innerRadius = currentRing * 2;
                const innerAngle = (currentSegment / numSegments) * 2 * Math.PI;
                const innerX = Math.floor(center.x + innerRadius * Math.cos(innerAngle));
                const innerY = Math.floor(center.y + innerRadius * Math.sin(innerAngle));
                if (isValidNeighbor(innerX, innerY)) {
                    neighbors.push({ x: innerX, y: innerY });
                }
            }

            // Outer ring neighbor
            const outerRadius = (currentRing + 2) * 2;
            const outerAngle = (currentSegment / numSegments) * 2 * Math.PI;
            const outerX = Math.floor(center.x + outerRadius * Math.cos(outerAngle));
            const outerY = Math.floor(center.y + outerRadius * Math.sin(outerAngle));
            if (isValidNeighbor(outerX, outerY)) {
                neighbors.push({ x: outerX, y: outerY });
            }

            // Shuffle neighbors for randomness
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }

            return neighbors;
        }
        
        // Original neighbor logic for other styles
        const neighbors = [];
        const directions = [];

        switch (this.style) {
            case 'spiral':
                // For spiral, prefer clockwise movement
                directions.push(
                    { dx: 1, dy: 0 },  // right
                    { dx: 0, dy: 1 },  // down
                    { dx: -1, dy: 0 }, // left
                    { dx: 0, dy: -1 }  // up
                );
                break;
            case 'zigzag':
                // For zigzag, prefer horizontal then vertical movement
                if (cell.y % 2 === 0) {
                    directions.push(
                        { dx: 1, dy: 0 },  // right
                        { dx: 0, dy: 1 },  // down
                        { dx: 0, dy: -1 }, // up
                        { dx: -1, dy: 0 }  // left
                    );
                } else {
                    directions.push(
                        { dx: -1, dy: 0 }, // left
                        { dx: 0, dy: 1 },  // down
                        { dx: 0, dy: -1 }, // up
                        { dx: 1, dy: 0 }   // right
                    );
                }
                break;
            case 'honeycomb':
                // For honeycomb, use six directions
                directions.push(
                    { dx: 1, dy: 0 },     // right
                    { dx: 0.5, dy: 1 },   // down-right
                    { dx: -0.5, dy: 1 },  // down-left
                    { dx: -1, dy: 0 },    // left
                    { dx: -0.5, dy: -1 }, // up-left
                    { dx: 0.5, dy: -1 }   // up-right
                );
                break;
            default:
                // Classic grid movement
                directions.push(
                    { dx: 0, dy: -1 }, // up
                    { dx: 1, dy: 0 },  // right
                    { dx: 0, dy: 1 },  // down
                    { dx: -1, dy: 0 }  // left
                );
        }

        // Shuffle directions for randomness
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        for (const dir of directions) {
            const newX = Math.round(cell.x + dir.dx);
            const newY = Math.round(cell.y + dir.dy);

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
        if (this.style === 'spiral') {
            const currentCell = this.grid[current.y][current.x];
            const nextCell = this.grid[next.y][next.x];

            if (currentCell.ring === nextCell.ring) {
                // Same ring - remove clockwise wall
                if ((currentCell.segment + 1) % this.getNumSegments(currentCell.ring) === nextCell.segment) {
                    currentCell.walls.clockwise = false;
                } else {
                    nextCell.walls.clockwise = false;
                }
            } else {
                // Different rings - remove outward wall
                if (currentCell.ring < nextCell.ring) {
                    currentCell.walls.outward = false;
                } else {
                    nextCell.walls.outward = false;
                }
            }
        } else {
            // Original wall removal logic for other styles
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
    }

    async validateMaze() {
        if (this.entrances === 1) {
            if (!this.entryPoints[0] || !this.exitPoints[0]) {
                return false;
            }
            const result = await this.animateValidation(this.entryPoints[0], this.exitPoints[0]);
            if (result.isValid) {
                this.validationPath = result.path;
                return true;
            }
            return false;
        }
        
        // For multiple entrance maze...
        for (let i = 0; i < this.entryPoints.length; i++) {
            if (!this.entryPoints[i] || !this.exitPoints[i]) {
                return false;
            }
            const result = await this.animateValidation(this.entryPoints[i], this.exitPoints[i]);
            if (!result.isValid) {
                return false;
            }
            this.validationPath = result.path;
        }
        return true;
    }

    async animateValidation(start, end) {
        if (!start || !end || typeof start.x === 'undefined' || typeof end.x === 'undefined') {
            console.error('Invalid start or end points for validation');
            return { isValid: false, path: null };
        }

        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        const getKey = (point) => `${point.x},${point.y}`;
        let foundPath = false;

        while (openSet.length > 0) {
            const current = openSet.shift();
            const currentKey = getKey(current);
            
            if (current.x === end.x && current.y === end.y) {
                // Create the final path
                const validationPath = [];
                let pathCurrent = current;
                while (cameFrom.has(getKey(pathCurrent))) {
                    validationPath.unshift(pathCurrent);
                    pathCurrent = cameFrom.get(getKey(pathCurrent));
                }
                validationPath.unshift(start);
                return { isValid: true, path: validationPath };
            }

            closedSet.add(currentKey);
            const neighbors = this.getAccessibleNeighbors(current);

            for (const neighbor of neighbors) {
                const neighborKey = getKey(neighbor);
                if (!closedSet.has(neighborKey)) {
                    if (!openSet.find(p => getKey(p) === neighborKey)) {
                        openSet.push(neighbor);
                        cameFrom.set(neighborKey, current);
                    }
                }
            }

            // Visualize the validation process
            if (this.animationCallback) {
                // Create a temporary solution path for visualization
                const validationPath = [];
                let pathCurrent = current;
                while (cameFrom.has(getKey(pathCurrent))) {
                    validationPath.unshift(pathCurrent);
                    pathCurrent = cameFrom.get(getKey(pathCurrent));
                }
                validationPath.unshift(start);

                // Update the display with the current validation state
                this.solution = validationPath;
                await this.animationCallback(this.grid, current);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        return { isValid: false, path: null };
    }

    findSpiralEntryPoint() {
        // Find a valid point on the outermost ring
        const outerRing = Math.floor(Math.min(this.width, this.height) / 4) - 1;
        const center = { 
            x: Math.floor(this.width / 2), 
            y: Math.floor(this.height / 2) 
        };

        // Try a few random angles to find a valid entry point
        for (let attempt = 0; attempt < 8; attempt++) {
            const angle = Math.random() * 2 * Math.PI;
            const radius = outerRing * 2;
            const x = Math.floor(center.x + radius * Math.cos(angle));
            const y = Math.floor(center.y + radius * Math.sin(angle));

            if (x >= 0 && x < this.width && y >= 0 && y < this.height && 
                this.grid[y][x].inShape) {
                return { x, y, side: 'outer' };
            }
        }
        return null;
    }

    findValidHoneycombPoint(side) {
        const attempts = 10;
        for (let i = 0; i < attempts; i++) {
            let point;
            if (side === 'left') {
                point = { 
                    x: 0, 
                    y: Math.floor(this.height / 3 + Math.random() * this.height / 3), 
                    side: 'left' 
                };
            } else {
                point = { 
                    x: this.width - 1, 
                    y: Math.floor(this.height / 3 + Math.random() * this.height / 3), 
                    side: 'right' 
                };
            }
            
            if (this.grid[point.y][point.x].inShape) {
                return point;
            }
        }
        return null;
    }

    getNumSegments(ring) {
        const radius = (ring + 1) * 2;
        return Math.max(8, Math.floor(2 * Math.PI * radius / 2));
    }
}

class MazeRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.currentTheme = THEMES.classic;
        this.animating = false;
    }

    setTheme(themeName) {
        this.currentTheme = THEMES[themeName] || THEMES.classic;
    }

    async render(maze, style = 'classic', showSolution = false) {
        const cellSize = Math.min(
            (this.canvas.width - 100) / maze.width,  // Increased padding
            (this.canvas.height - 100) / maze.height
        );

        // Center the maze
        const center = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };

        // Clear canvas and set background
        this.ctx.fillStyle = this.currentTheme.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;

        if (style === 'spiral') {
            // Draw spiral maze with concentric circles
            const ringSpacing = cellSize * 2;  // Space between rings
            const numRings = Math.floor(maze.width / 4);  // Number of rings

            // Draw rings
            for (let ring = 0; ring < numRings; ring++) {
                const radius = (ring + 1) * ringSpacing;
                const numSegments = Math.max(8, Math.floor(2 * Math.PI * radius / ringSpacing));

                // Draw the circular wall for this ring
                this.ctx.beginPath();
                this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
                this.ctx.stroke();

                // Draw radial walls
                for (let segment = 0; segment < numSegments; segment++) {
                    const angle = (segment / numSegments) * 2 * Math.PI;
                    
                    // Check if this radial wall should exist
                    const x = Math.floor(center.x + radius * Math.cos(angle));
                    const y = Math.floor(center.y + radius * Math.sin(angle));
                    const cellX = Math.floor((x - center.x + maze.width * cellSize / 2) / cellSize);
                    const cellY = Math.floor((y - center.y + maze.height * cellSize / 2) / cellSize);

                    if (cellX >= 0 && cellX < maze.width && cellY >= 0 && cellY < maze.height) {
                        const cell = maze.grid[cellY][cellX];
                        if (cell.inShape && cell.walls.clockwise) {
                            // Draw radial wall
                            this.ctx.beginPath();
                            this.ctx.moveTo(
                                center.x + (radius - ringSpacing) * Math.cos(angle),
                                center.y + (radius - ringSpacing) * Math.sin(angle)
                            );
                            this.ctx.lineTo(
                                center.x + radius * Math.cos(angle),
                                center.y + radius * Math.sin(angle)
                            );
                            this.ctx.stroke();
                        }
                    }
                }
            }

            // Draw entry/exit points
            if (maze.entryPoints.length > 0) {
                this.ctx.fillStyle = '#00ff00';  // Green for entry
                for (const point of maze.entryPoints) {
                    const angle = (point.segment / maze.getNumSegments(point.ring)) * 2 * Math.PI;
                    const radius = (point.ring + 1) * ringSpacing;
                    const x = center.x + radius * Math.cos(angle);
                    const y = center.y + radius * Math.sin(angle);
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, cellSize / 3, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }

            if (maze.exitPoints.length > 0) {
                this.ctx.fillStyle = '#ffff00';  // Yellow for exit
                for (const point of maze.exitPoints) {
                    const angle = (point.segment / maze.getNumSegments(point.ring)) * 2 * Math.PI;
                    const radius = (point.ring + 1) * ringSpacing;
                    const x = center.x + radius * Math.cos(angle);
                    const y = center.y + radius * Math.sin(angle);
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, cellSize / 3, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
            }

            // Draw solution if requested
            if (showSolution && maze.solution && maze.solution.length > 0) {
                this.ctx.strokeStyle = this.currentTheme.solution;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();

                for (let i = 0; i < maze.solution.length; i++) {
                    const point = maze.solution[i];
                    const angle = (point.segment / maze.getNumSegments(point.ring)) * 2 * Math.PI;
                    const radius = (point.ring + 1) * ringSpacing;
                    const x = center.x + radius * Math.cos(angle);
                    const y = center.y + radius * Math.sin(angle);

                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
                this.ctx.stroke();
            }
        } else {
            // Original rendering for other styles
            for (let y = 0; y < maze.height; y++) {
                for (let x = 0; x < maze.width; x++) {
                    const cell = maze.grid[y][x];
                    if (cell.inShape) {
                        const cellX = center.x + (x - center.x + maze.width * cellSize / 2) / cellSize;
                        const cellY = center.y + (y - center.y + maze.height * cellSize / 2) / cellSize;
                        this.drawClassicCell(cell, cellX, cellY, cellSize);
                    }
                }
            }
        }
    }

    drawCurvedMaze(maze, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;
        
        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[y][x];
                if (!cell.inShape) continue;

                const cellX = offsetX + (x * cellSize);
                const cellY = offsetY + (y * cellSize);

                if (cell.walls.right && x < maze.width - 1) {
                    this.drawCurvedWall(
                        cellX + cellSize, cellY,
                        cellX + cellSize, cellY + cellSize
                    );
                }
                if (cell.walls.bottom && y < maze.height - 1) {
                    this.drawCurvedWall(
                        cellX, cellY + cellSize,
                        cellX + cellSize, cellY + cellSize
                    );
                }
            }
        }
    }

    drawCurvedWall(x1, y1, x2, y2) {
        const controlPoint = {
            x: (x1 + x2) / 2 + (Math.random() * 10 - 5),
            y: (y1 + y2) / 2 + (Math.random() * 10 - 5)
        };

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, x2, y2);
        this.ctx.stroke();
    }

    drawConcentricMaze(maze, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;

        const centerX = maze.width / 2;
        const centerY = maze.height / 2;

        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[y][x];
                if (!cell.inShape) continue;

                const cellX = offsetX + (x * cellSize);
                const cellY = offsetY + (y * cellSize);

                // Calculate distance from center
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );

                if (cell.walls.right && x < maze.width - 1) {
                    this.drawConcentricWall(
                        cellX + cellSize, cellY,
                        cellX + cellSize, cellY + cellSize,
                        distanceFromCenter
                    );
                }
                if (cell.walls.bottom && y < maze.height - 1) {
                    this.drawConcentricWall(
                        cellX, cellY + cellSize,
                        cellX + cellSize, cellY + cellSize,
                        distanceFromCenter
                    );
                }
            }
        }
    }

    drawConcentricWall(x1, y1, x2, y2, distance) {
        const amplitude = 5 + (distance * 0.5);
        const frequency = Math.PI / (30 + distance * 2);
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        
        for (let t = 0; t <= 1; t += 0.1) {
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const offset = Math.sin(t * Math.PI * 2 + distance) * amplitude;
            
            this.ctx.lineTo(x + offset, y + offset);
        }
        
        this.ctx.stroke();
    }

    drawWavyMaze(maze, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;

        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[y][x];
                if (!cell.inShape) continue;

                const cellX = offsetX + (x * cellSize);
                const cellY = offsetY + (y * cellSize);

                if (cell.walls.right && x < maze.width - 1) {
                    this.drawWavyWall(
                        cellX + cellSize, cellY,
                        cellX + cellSize, cellY + cellSize
                    );
                }
                if (cell.walls.bottom && y < maze.height - 1) {
                    this.drawWavyWall(
                        cellX, cellY + cellSize,
                        cellX + cellSize, cellY + cellSize
                    );
                }
            }
        }
    }

    drawWavyWall(x1, y1, x2, y2) {
        const amplitude = 3;
        const frequency = Math.PI / 15;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        
        for (let t = 0; t <= 1; t += 0.1) {
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            const offset = Math.sin(t * Math.PI * 4) * amplitude;
            
            if (x1 === x2) { // Vertical wall
                this.ctx.lineTo(x + offset, y);
            } else { // Horizontal wall
                this.ctx.lineTo(x, y + offset);
            }
        }
        
        this.ctx.stroke();
    }

    drawOrganicMaze(maze, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;

        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[y][x];
                if (!cell.inShape) continue;

                const cellX = offsetX + (x * cellSize);
                const cellY = offsetY + (y * cellSize);

                if (cell.walls.right && x < maze.width - 1) {
                    this.drawOrganicWall(
                        cellX + cellSize, cellY,
                        cellX + cellSize, cellY + cellSize
                    );
                }
                if (cell.walls.bottom && y < maze.height - 1) {
                    this.drawOrganicWall(
                        cellX, cellY + cellSize,
                        cellX + cellSize, cellY + cellSize
                    );
                }
            }
        }
    }

    drawOrganicWall(x1, y1, x2, y2) {
        const numPoints = 4;
        const points = [];
        
        // Generate control points
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const variance = 8;
            points.push({
                x: x1 + (x2 - x1) * t + (Math.random() * variance - variance/2),
                y: y1 + (y2 - y1) * t + (Math.random() * variance - variance/2)
            });
        }
        
        // Draw smooth curve through points
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        
        for (let i = 1; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawClassicMaze(maze, cellSize, offsetX, offsetY) {
        this.ctx.strokeStyle = this.currentTheme.walls;
        this.ctx.lineWidth = 2;

        for (let y = 0; y < maze.height; y++) {
            for (let x = 0; x < maze.width; x++) {
                const cell = maze.grid[y][x];
                if (!cell.inShape) continue;

                const cellX = offsetX + (x * cellSize);
                const cellY = offsetY + (y * cellSize);

                if (cell.walls.right && x < maze.width - 1) {
                    this.drawLine(cellX + cellSize, cellY, cellX + cellSize, cellY + cellSize);
                }
                if (cell.walls.bottom && y < maze.height - 1) {
                    this.drawLine(cellX, cellY + cellSize, cellX + cellSize, cellY + cellSize);
                }
            }
        }
    }

    drawEntryExitPoints(maze, cellSize, offsetX, offsetY) {
        // Draw entry points with green flag
        maze.entryPoints.forEach(point => {
            const x = offsetX + point.x * cellSize;
            const y = offsetY + point.y * cellSize;
            
            this.drawStartFlag(x, y, cellSize);
        });

        // Draw exit points with trophy
        maze.exitPoints.forEach(point => {
            const x = offsetX + point.x * cellSize;
            const y = offsetY + point.y * cellSize;
            
            this.drawTrophy(x, y, cellSize);
        });
    }

    drawStartFlag(x, y, cellSize) {
        const ctx = this.ctx;
        const flagSize = cellSize * 0.8;
        const poleX = x + cellSize * 0.3;
        const poleY = y + cellSize * 0.2;
        
        // Draw flag pole
        ctx.beginPath();
        ctx.strokeStyle = '#4a3000';
        ctx.lineWidth = cellSize * 0.06;
        ctx.moveTo(poleX, poleY);
        ctx.lineTo(poleX, poleY + flagSize * 0.8);
        ctx.stroke();
        
        // Draw flag
        ctx.beginPath();
        ctx.fillStyle = '#00cc00';
        ctx.moveTo(poleX, poleY);
        ctx.lineTo(poleX + flagSize * 0.5, poleY + flagSize * 0.25);
        ctx.lineTo(poleX, poleY + flagSize * 0.5);
        ctx.closePath();
        ctx.fill();
    }

    drawTrophy(x, y, cellSize) {
        const ctx = this.ctx;
        const size = cellSize * 0.7;
        const centerX = x + cellSize/2;
        const centerY = y + cellSize/2;
        
        // Draw trophy cup
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#daa520';
        ctx.lineWidth = 2;
        
        // Draw cup body
        ctx.beginPath();
        ctx.moveTo(centerX - size/3, centerY - size/4);
        ctx.bezierCurveTo(
            centerX - size/2, centerY - size/2,
            centerX + size/2, centerY - size/2,
            centerX + size/3, centerY - size/4
        );
        ctx.lineTo(centerX + size/4, centerY + size/4);
        ctx.lineTo(centerX - size/4, centerY + size/4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw base
        ctx.fillRect(centerX - size/3, centerY + size/4, size * 2/3, size/8);
        ctx.strokeRect(centerX - size/3, centerY + size/4, size * 2/3, size/8);
        
        // Draw handles
        ctx.beginPath();
        ctx.arc(centerX - size/3, centerY - size/6, size/6, Math.PI/2, -Math.PI/2, true);
        ctx.arc(centerX + size/3, centerY - size/6, size/6, -Math.PI/2, Math.PI/2, true);
        ctx.stroke();
    }

    async drawSolution(maze, cellSize, offsetX, offsetY) {
        if (!maze.solution) return;

        // Draw solution path
        this.ctx.beginPath();
        const start = maze.solution[0];
        this.ctx.moveTo(
            offsetX + start.x * cellSize + cellSize/2,
            offsetY + start.y * cellSize + cellSize/2
        );

        for (let i = 1; i < maze.solution.length; i++) {
            const point = maze.solution[i];
            const x = offsetX + point.x * cellSize + cellSize/2;
            const y = offsetY + point.y * cellSize + cellSize/2;
            this.ctx.lineTo(x, y);
        }

        // Style for solution path
        this.ctx.strokeStyle = this.currentTheme.solution;
        this.ctx.lineWidth = cellSize/6;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Add arrow markers along the solution path
        const dashLength = 1000;
        this.ctx.setLineDash([dashLength/4, dashLength/4]);
        this.ctx.lineDashOffset = dashLength;

        // Animate the solution
        await new Promise(resolve => {
            const startTime = performance.now();
            const duration = 1500;

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                this.ctx.lineDashOffset = dashLength * (1 - progress);
                this.ctx.stroke();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.ctx.setLineDash([]); // Remove dash pattern
                    this.ctx.stroke(); // Final stroke
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    drawSpiralCell(cell, x, y, cellSize) {
        if (!cell.inShape) return;

        const center = { 
            x: this.canvas.width / 2, 
            y: this.canvas.height / 2 
        };

        const radius = (cell.ring + 1) * cellSize;
        const numSegments = Math.max(8, Math.floor(2 * Math.PI * radius / 2));
        const angleStep = (2 * Math.PI) / numSegments;
        const currentAngle = (cell.segment / numSegments) * 2 * Math.PI;
        const nextAngle = ((cell.segment + 1) / numSegments) * 2 * Math.PI;

        this.ctx.beginPath();
        
        // Draw circular wall (between rings)
        if (cell.walls.outward) {
            const outerRadius = radius + cellSize;
            this.ctx.arc(center.x, center.y, outerRadius, 
                currentAngle, nextAngle);
        }

        // Draw radial wall (between segments)
        if (cell.walls.clockwise) {
            this.ctx.moveTo(
                center.x + radius * Math.cos(nextAngle),
                center.y + radius * Math.sin(nextAngle)
            );
            this.ctx.lineTo(
                center.x + (radius + cellSize) * Math.cos(nextAngle),
                center.y + (radius + cellSize) * Math.sin(nextAngle)
            );
        }

        this.ctx.stroke();
    }
}

// Color themes
const THEMES = {
    classic: {
        background: '#ffffff',
        walls: '#000000',
        solution: '#ff0000',
        start: '#00ff00',
        end: '#ff0000'
    },
    forest: {
        background: '#e8f5e9',
        walls: '#2e7d32',
        solution: '#81c784',
        start: '#43a047',
        end: '#1b5e20'
    },
    ocean: {
        background: '#e3f2fd',
        walls: '#1565c0',
        solution: '#64b5f6',
        start: '#2196f3',
        end: '#0d47a1'
    },
    sunset: {
        background: '#fff3e0',
        walls: '#ef6c00',
        solution: '#ff9800',
        start: '#ff5722',
        end: '#e65100'
    },
    neon: {
        background: '#000000',
        walls: '#00ff00',
        solution: '#ff00ff',
        start: '#00ffff',
        end: '#ffff00'
    }
};

// Shape definitions
const SHAPES = {
    square: {
        getPath: (width, height) => ({
            points: [
                [0, 0],
                [width, 0],
                [width, height],
                [0, height]
            ],
            isClosed: true
        })
    },
    circle: {
        getPath: (width, height) => {
            const radius = Math.min(width, height) / 2;
            const centerX = width / 2;
            const centerY = height / 2;
            const points = [];
            const segments = 60;
            
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                points.push([
                    centerX + radius * Math.cos(angle),
                    centerY + radius * Math.sin(angle)
                ]);
            }
            
            return { points, isClosed: true };
        }
    },
    heart: {
        getPath: (width, height) => {
            const scale = Math.min(width, height);
            const points = [];
            const segments = 40;
            
            for (let i = 0; i < segments; i++) {
                const t = (i / segments) * 2 * Math.PI;
                const x = scale * (16 * Math.pow(Math.sin(t), 3)) / 32;
                const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 32;
                points.push([x + width/2, -y + height/2]);
            }
            
            return { points, isClosed: true };
        }
    },
    star: {
        getPath: (width, height) => {
            const scale = Math.min(width, height) / 2;
            const points = [];
            const spikes = 5;
            
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? scale : scale * 0.4;
                const angle = (i / (spikes * 2)) * Math.PI * 2;
                points.push([
                    width/2 + radius * Math.cos(angle),
                    height/2 + radius * Math.sin(angle)
                ]);
            }
            
            return { points, isClosed: true };
        }
    },
    hexagon: {
        getPath: (width, height) => {
            const radius = Math.min(width, height) / 2;
            const points = [];
            
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                points.push([
                    width/2 + radius * Math.cos(angle),
                    height/2 + radius * Math.sin(angle)
                ]);
            }
            
            return { points, isClosed: true };
        }
    }
};

// Add this function to handle the loading overlay
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = document.getElementById('loadingMessage');
    messageElement.textContent = message;
    overlay.classList.add('show');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('show');
}

// Add these functions at the top level
function showCompletionDialog() {
    const dialog = document.getElementById('completionDialog');
    dialog.classList.add('show');
}

function hideCompletionDialog() {
    const dialog = document.getElementById('completionDialog');
    dialog.classList.remove('show');
}

async function downloadAsPDF() {
    const canvas = document.getElementById('mazeCanvas');
    // Ensure we render without solution path
    await renderer.render(currentMaze, styleSelect.value, false);
    
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save('maze.pdf');
}

function downloadAsJPG() {
    const canvas = document.getElementById('mazeCanvas');
    // Ensure we render without solution path
    renderer.render(currentMaze, styleSelect.value, false);
    
    const link = document.createElement('a');
    link.download = 'maze.jpg';
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
}

function printMaze() {
    const canvas = document.getElementById('mazeCanvas');
    // Ensure we render without solution path
    renderer.render(currentMaze, styleSelect.value, false);
    
    const win = window.open('');
    win.document.write(`<img src="${canvas.toDataURL()}" onload="window.print();window.close()">`);
}

// Add these new functions
async function downloadAsPDFSolved() {
    try {
        const canvas = document.getElementById('mazeCanvas');
        currentMaze.solution = currentMaze.validationPath;
        await renderer.render(currentMaze, styleSelect.value, true);
        
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save('maze-with-solution.pdf');
        
        currentMaze.solution = [];
        await renderer.render(currentMaze, styleSelect.value, false);
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Failed to generate PDF', true);
    }
}

async function downloadAsJPGSolved() {
    try {
        const canvas = document.getElementById('mazeCanvas');
        currentMaze.solution = currentMaze.validationPath;
        await renderer.render(currentMaze, styleSelect.value, true);
        
        const link = document.createElement('a');
        link.download = 'maze-with-solution.jpg';
        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
        
        currentMaze.solution = [];
        await renderer.render(currentMaze, styleSelect.value, false);
    } catch (error) {
        console.error('Error generating JPG:', error);
        showNotification('Failed to generate JPG', true);
    }
}

async function printMazeSolved() {
    try {
        const canvas = document.getElementById('mazeCanvas');
        currentMaze.solution = currentMaze.validationPath;
        await renderer.render(currentMaze, styleSelect.value, true);
        
        const win = window.open('');
        win.document.write(`<img src="${canvas.toDataURL()}" onload="window.print();window.close()">`);
        
        currentMaze.solution = [];
        await renderer.render(currentMaze, styleSelect.value, false);
    } catch (error) {
        console.error('Error printing maze:', error);
        showNotification('Failed to print maze', true);
    }
}

// Update the generateNewMaze function
async function generateNewMaze() {
    try {
        if (!generateButton || !renderer) {
            console.error('UI not initialized');
            return;
        }

        generateButton.disabled = true;
        let isValid = false;
        let attempts = 0;
        const maxAttempts = 3;

        while (!isValid && attempts < maxAttempts) {
            showLoading(`Generating maze (Attempt ${attempts + 1}/${maxAttempts})...`);
            
            const difficulty = parseInt(difficultyInput.value);
            const size = sizeSelect.value;
            const dimensions = calculateDimensions(difficulty, size);
            
            currentMaze = new MazeGenerator(dimensions.width, dimensions.height);
            currentMaze.entrances = parseInt(entrancesSelect.value);
            currentMaze.animationSpeed = 100;
            
            // Pass both shape and style to initializeGrid
            currentMaze.initializeGrid(shapeSelect.value, styleSelect.value);

            currentMaze.animationCallback = (grid, cell) => {
                renderer.render(currentMaze, styleSelect.value, true);
                return new Promise(resolve => setTimeout(resolve, 0));
            };

            await currentMaze.generateMaze(true);
            
            showLoading('Validating maze (checking for valid path)...');
            isValid = await currentMaze.validateMaze();
            
            if (isValid) {
                currentMaze.solution = []; // Clear any remaining solution path
                await renderer.render(currentMaze, styleSelect.value, false); // Explicitly render without solution
                hideLoading();
                showNotification('Maze generated successfully!');
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure clean render
                showCompletionDialog();
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    showLoading('No valid path found, trying again...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        if (!isValid) {
            showNotification('Failed to generate a valid maze after multiple attempts. Please try again.', true);
        }
    } catch (error) {
        console.error('Maze generation failed:', error);
        showNotification('Failed to generate maze. Please try again.', true);
    } finally {
        hideLoading();
        if (generateButton) {
            generateButton.disabled = false;
        }
    }
}

// Update the initialization code
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mazeCanvas');
    
    // Initialize all UI elements
    generateButton = document.getElementById('generate');
    difficultyInput = document.getElementById('difficulty');
    difficultyValue = document.getElementById('difficultyValue');
    shapeSelect = document.getElementById('shape');
    styleSelect = document.getElementById('style');
    themeSelect = document.getElementById('theme');
    sizeSelect = document.getElementById('size');
    entrancesSelect = document.getElementById('entrances');
    showSolutionButton = document.getElementById('showSolution');

    // Set canvas size
    canvas.width = 800;
    canvas.height = 800;

    // Initialize renderer
    renderer = new MazeRenderer(canvas);

    // Initialize the canvas with a blank state
    renderer.ctx.fillStyle = THEMES.classic.background;
    renderer.ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Theme change handler
    themeSelect.addEventListener('change', () => {
        renderer.setTheme(themeSelect.value);
        if (currentMaze) {
            renderer.render(currentMaze, styleSelect.value);
        }
    });

    // Update difficulty display value
    difficultyInput.addEventListener('input', () => {
        difficultyValue.textContent = difficultyInput.value;
    });

    // Add event listeners
    generateButton.addEventListener('click', generateNewMaze);
    
    showSolutionButton.addEventListener('click', async () => {
        if (currentMaze) {
            showLoading('Finding solution...');
            currentMaze.findSolution();
            await renderer.render(currentMaze, styleSelect.value, true);
            hideLoading();
        }
    });

    // Add completion dialog event listeners
    document.getElementById('downloadPDF').addEventListener('click', async () => {
        await downloadAsPDF();
    });

    document.getElementById('downloadJPG').addEventListener('click', () => {
        downloadAsJPG();
    });

    document.getElementById('printMaze').addEventListener('click', () => {
        printMaze();
    });

    // Add solved version event listeners
    document.getElementById('downloadPDFSolved').addEventListener('click', async () => {
        try {
            showLoading('Generating solved maze PDF...');
            await downloadAsPDFSolved();
            hideLoading();
        } catch (error) {
            hideLoading();
            showNotification('Failed to generate PDF', true);
        }
    });

    document.getElementById('downloadJPGSolved').addEventListener('click', async () => {
        try {
            showLoading('Generating solved maze JPG...');
            await downloadAsJPGSolved();
            hideLoading();
        } catch (error) {
            hideLoading();
            showNotification('Failed to generate JPG', true);
        }
    });

    document.getElementById('printMazeSolved').addEventListener('click', async () => {
        try {
            showLoading('Preparing solved maze for printing...');
            await printMazeSolved();
            hideLoading();
        } catch (error) {
            hideLoading();
            showNotification('Failed to print maze', true);
        }
    });

    // Dialog controls
    document.getElementById('closeDialog').addEventListener('click', hideCompletionDialog);
    document.getElementById('completionDialog').addEventListener('click', (e) => {
        if (e.target.id === 'completionDialog') {
            hideCompletionDialog();
        }
    });

    // Style change handler
    styleSelect.addEventListener('change', () => {
        const selectedStyle = styleSelect.value;
        if (selectedStyle === 'spiral') {
            shapeSelect.value = 'circle';
            shapeSelect.disabled = true;
        } else {
            shapeSelect.disabled = false;
        }
    });
});

function calculateDimensions(difficulty, size) {
    const baseSize = {
        small: 10,
        medium: 15,
        large: 20
    };

    const multiplier = 1 + ((difficulty - 1) * 0.2);
    const base = baseSize[size];

    return {
        width: Math.floor(base * multiplier),
        height: Math.floor(base * multiplier)
    };
}

function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    const iconElement = notification.querySelector('.notification-icon');
    
    messageElement.textContent = message;
    iconElement.textContent = isError ? '✕' : '✓';
    
    notification.classList.toggle('error', isError);
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
} 