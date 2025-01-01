import { THEMES } from './utils/themes.js';
import { SHAPES } from './utils/shapes.js';
import { calculateDimensions, showNotification } from './utils/helpers.js';
import MazeGenerator from './MazeGenerator.js';
import MazeRenderer from './MazeRenderer.js';
import { downloadAsPDF, downloadAsJPG, printMaze } from './ui/exportHandlers.js';
import { initializeControls } from './ui/controls.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('mazeCanvas');
    canvas.width = 800;
    canvas.height = 800;

    const renderer = new MazeRenderer(canvas);
    initializeControls(renderer);

    // Initialize blank canvas
    renderer.ctx.fillStyle = THEMES.classic.background;
    renderer.ctx.fillRect(0, 0, canvas.width, canvas.height);
});

// Make these available globally if needed
window.THEMES = THEMES;
window.SHAPES = SHAPES;
window.calculateDimensions = calculateDimensions;
window.showNotification = showNotification;
window.downloadAsPDF = downloadAsPDF;
window.downloadAsJPG = downloadAsJPG;
window.printMaze = printMaze; 