// Export functionality (PDF, JPG, Print)
export async function downloadAsPDF(maze, renderer, showSolution = false) {
    if (!maze || !renderer) {
        throw new Error('Maze or renderer not initialized');
    }

    // Create a new jsPDF instance
    const pdf = new window.jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [renderer.canvas.width, renderer.canvas.height]
    });

    // Render maze with or without solution
    await renderer.render(maze, 'classic', showSolution);

    // Get canvas data
    const imgData = renderer.getCanvasData('image/jpeg', 1.0);

    // Add the image to PDF
    pdf.addImage(
        imgData, 
        'JPEG', 
        0, 
        0, 
        renderer.canvas.width, 
        renderer.canvas.height
    );

    // Save the PDF
    const filename = `maze_${showSolution ? 'solved_' : ''}${Date.now()}.pdf`;
    pdf.save(filename);
}

export function downloadAsJPG(maze, renderer, showSolution = false) {
    if (!maze || !renderer) {
        throw new Error('Maze or renderer not initialized');
    }

    // Render maze with or without solution
    renderer.render(maze, 'classic', showSolution);

    // Create temporary link element
    const link = document.createElement('a');
    link.download = `maze_${showSolution ? 'solved_' : ''}${Date.now()}.jpg`;
    
    // Get canvas data
    link.href = renderer.getCanvasData('image/jpeg', 0.8);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function printMaze(maze, renderer, showSolution = false) {
    if (!maze || !renderer) {
        throw new Error('Maze or renderer not initialized');
    }

    // Render maze with or without solution
    renderer.render(maze, 'classic', showSolution);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        throw new Error('Pop-up blocked. Please allow pop-ups and try again.');
    }

    // Write HTML content
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Maze ${showSolution ? '(Solved)' : ''}</title>
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    img {
                        width: 100%;
                        height: auto;
                    }
                }
            </style>
        </head>
        <body>
            <img src="${renderer.getCanvasData('image/jpeg', 1.0)}" />
            <script>
                window.onload = function() {
                    window.print();
                    window.setTimeout(function() {
                        window.close();
                    }, 100);
                };
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

// Helper function to create a high-resolution version of the maze
function createHighResVersion(maze, renderer, showSolution = false) {
    // Save current canvas dimensions
    const originalWidth = renderer.canvas.width;
    const originalHeight = renderer.canvas.height;

    // Set high resolution
    renderer.canvas.width = originalWidth * 2;
    renderer.canvas.height = originalHeight * 2;

    // Render high-res version
    renderer.render(maze, 'classic', showSolution);

    // Get the data
    const highResData = renderer.getCanvasData('image/jpeg', 1.0);

    // Restore original dimensions
    renderer.canvas.width = originalWidth;
    renderer.canvas.height = originalHeight;
    renderer.render(maze, 'classic', showSolution);

    return highResData;
} 