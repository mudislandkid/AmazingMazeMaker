// UI control handlers
import { calculateDimensions, showNotification } from '../utils/helpers.js';
import { downloadAsPDF, downloadAsJPG, printMaze } from './exportHandlers.js';
import MazeGenerator from '../MazeGenerator.js';

let currentMaze = null;
let renderer = null;

export function initializeControls(mazeRenderer) {
    renderer = mazeRenderer;
    
    // Get all control elements
    const generateButton = document.getElementById('generate');
    const difficultyInput = document.getElementById('difficulty');
    const difficultyValue = document.getElementById('difficultyValue');
    const shapeSelect = document.getElementById('shape');
    const styleSelect = document.getElementById('style');
    const themeSelect = document.getElementById('theme');
    const sizeSelect = document.getElementById('size');
    const entrancesSelect = document.getElementById('entrances');
    const showSolutionButton = document.getElementById('showSolution');

    // Add event listeners
    generateButton.addEventListener('click', generateNewMaze);
    difficultyInput.addEventListener('input', updateDifficultyDisplay);
    themeSelect.addEventListener('change', handleThemeChange);
    showSolutionButton.addEventListener('click', handleShowSolution);

    // Export handlers
    document.getElementById('downloadPDF').addEventListener('click', () => downloadAsPDF(currentMaze, renderer));
    document.getElementById('downloadJPG').addEventListener('click', () => downloadAsJPG(currentMaze, renderer));
    document.getElementById('printMaze').addEventListener('click', () => printMaze(currentMaze, renderer));
    
    // Solved version handlers
    document.getElementById('downloadPDFSolved').addEventListener('click', handleSolvedPDF);
    document.getElementById('downloadJPGSolved').addEventListener('click', handleSolvedJPG);
    document.getElementById('printMazeSolved').addEventListener('click', handleSolvedPrint);

    // Dialog controls
    document.getElementById('closeDialog').addEventListener('click', hideCompletionDialog);
    document.getElementById('completionDialog').addEventListener('click', handleDialogClick);

    // Add style change handler
    styleSelect.addEventListener('change', (e) => {
        if (e.target.value === 'circular') {
            shapeSelect.value = 'circle';
            shapeSelect.disabled = true;
        } else {
            shapeSelect.disabled = false;
        }
    });
}

async function generateNewMaze() {
    const generateButton = document.getElementById('generate');
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
            
            const difficulty = parseInt(document.getElementById('difficulty').value);
            const size = document.getElementById('size').value;
            const dimensions = calculateDimensions(difficulty, size);
            
            currentMaze = new MazeGenerator(dimensions.width, dimensions.height);
            currentMaze.entrances = parseInt(document.getElementById('entrances').value);
            currentMaze.animationSpeed = 100;
            
            const style = document.getElementById('style').value;
            const shape = document.getElementById('shape').value;
            currentMaze.initializeGrid(shape, style);

            currentMaze.animationCallback = (grid, cell) => {
                renderer.render(currentMaze, document.getElementById('style').value, false);
                return new Promise(resolve => setTimeout(resolve, 0));
            };

            await currentMaze.generateMaze(true);
            
            showLoading('Validating maze...');
            isValid = await currentMaze.validateMaze();
            
            if (isValid) {
                currentMaze.validationPath = null;  // Clear validation path
                await renderer.render(currentMaze, document.getElementById('style').value, false);
                hideLoading();
                showNotification('Maze generated successfully!');
                await new Promise(resolve => setTimeout(resolve, 100));
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

function updateDifficultyDisplay() {
    const difficultyValue = document.getElementById('difficultyValue');
    const difficultyInput = document.getElementById('difficulty');
    if (difficultyValue && difficultyInput) {
        difficultyValue.textContent = difficultyInput.value;
    }
}

function handleThemeChange() {
    const themeName = document.getElementById('theme').value;
    renderer.setTheme(themeName);
    if (currentMaze) {
        renderer.render(currentMaze, document.getElementById('style').value);
    }
}

async function handleShowSolution() {
    if (currentMaze) {
        showLoading('Showing solution...');
        await renderer.render(currentMaze, document.getElementById('style').value, true);
        hideLoading();
    }
}

// Dialog helpers
function showCompletionDialog() {
    document.getElementById('completionDialog').classList.add('show');
}

function hideCompletionDialog() {
    document.getElementById('completionDialog').classList.remove('show');
}

function handleDialogClick(e) {
    if (e.target.id === 'completionDialog') {
        hideCompletionDialog();
    }
}

// Loading helpers
function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const messageElement = document.getElementById('loadingMessage');
    if (messageElement) messageElement.textContent = message;
    if (overlay) overlay.classList.add('show');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
}

// Export handlers with solution
async function handleSolvedPDF() {
    try {
        showLoading('Generating solved maze PDF...');
        await downloadAsPDF(currentMaze, renderer, true);
        hideLoading();
    } catch (error) {
        hideLoading();
        showNotification('Failed to generate PDF', true);
    }
}

async function handleSolvedJPG() {
    try {
        showLoading('Generating solved maze JPG...');
        await downloadAsJPG(currentMaze, renderer, true);
        hideLoading();
    } catch (error) {
        hideLoading();
        showNotification('Failed to generate JPG', true);
    }
}

async function handleSolvedPrint() {
    try {
        showLoading('Preparing solved maze for printing...');
        await printMaze(currentMaze, renderer, true);
        hideLoading();
    } catch (error) {
        hideLoading();
        showNotification('Failed to print maze', true);
    }
}

// Export other functions if they're used externally
export {
    currentMaze,
    renderer,
    generateNewMaze,
    handleThemeChange,
    handleShowSolution
}; 