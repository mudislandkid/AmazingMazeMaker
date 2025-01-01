// Helper functions
export function calculateDimensions(difficulty, size) {
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

export function showNotification(message, isError = false) {
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