// Reusable Progress Bar Component
import React from 'react';

const ProgressBar = ({ 
  percentage = 0, 
  showLabel = true, 
  height = '8px', 
  backgroundColor = '#e9ecef',
  progressColor = null,
  labelStyle = {},
  containerStyle = {}
}) => {
  // Auto-select color based on percentage if not provided
  const getProgressColor = () => {
    if (progressColor) return progressColor;
    if (percentage === 100) return '#28a745'; // Green for complete
    if (percentage >= 75) return '#20c997';    // Teal for high progress
    if (percentage >= 50) return '#007bff';    // Blue for medium progress
    if (percentage >= 25) return '#ffc107';    // Yellow for low progress
    return '#dc3545';                          // Red for very low progress
  };

  return (
    <div style={{ width: '100%', ...containerStyle }}>
      <div style={{
        width: '100%',
        backgroundColor: backgroundColor,
        borderRadius: '4px',
        height: height,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${Math.min(Math.max(percentage, 0), 100)}%`,
          backgroundColor: getProgressColor(),
          height: '100%',
          borderRadius: '4px',
          transition: 'width 0.3s ease'
        }}>
        </div>
      </div>
      {showLabel && (
        <small style={{ 
          fontSize: '10px', 
          color: '#6c757d',
          display: 'block',
          marginTop: '2px',
          ...labelStyle 
        }}>
          {percentage}% Complete
        </small>
      )}
    </div>
  );
};

export default ProgressBar;
