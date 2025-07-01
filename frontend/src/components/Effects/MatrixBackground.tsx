import React, { useEffect, useRef } from 'react';

const MatrixBackground: React.FC = () => {
  const matrixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!matrixRef.current) return;

    const generateRandomChars = (length: number): string => {
      const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const createMatrixRain = () => {
      if (!matrixRef.current) return;
      
      // Clear existing columns
      matrixRef.current.innerHTML = '';
      
      const columns = Math.floor(window.innerWidth / 20);
      
      for (let i = 0; i < columns; i++) {
        const column = document.createElement('div');
        column.className = 'matrix-column';
        column.style.left = i * 20 + 'px';
        column.style.animationDelay = Math.random() * 20 + 's';
        column.textContent = generateRandomChars(50);
        matrixRef.current.appendChild(column);
      }
    };

    // Create initial matrix rain
    createMatrixRain();

    // Recreate on window resize
    const handleResize = () => {
      createMatrixRain();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={matrixRef} className="matrix-bg" />;
};

export default MatrixBackground;