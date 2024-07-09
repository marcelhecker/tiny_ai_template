function adjustTextareaHeight(textarea) {
    
    const minHeight = 40;
    textarea.style.height = minHeight + 'px'; // Set height to minimum to recalculate scrollHeight
    const newHeight = Math.min(textarea.scrollHeight, 342);
    textarea.style.height = newHeight + 'px';
}

