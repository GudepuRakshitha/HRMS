// Reusable Status Badge Component
import React from 'react';
import { getStatusColor } from '../../services/profileService';

const StatusBadge = ({ 
  status, 
  text = null,
  size = 'small',
  variant = 'default'
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'large':
        return { padding: '6px 14px', fontSize: '14px' };
      case 'medium':
        return { padding: '5px 12px', fontSize: '13px' };
      case 'small':
      default:
        return { padding: '4px 10px', fontSize: '12px' };
    }
  };

  const getBackgroundColor = () => {
    if (variant === 'email') {
      return status ? '#28a745' : '#dc3545';
    }
    return getStatusColor(status) || '#6c757d';
  };

  const getDisplayText = () => {
    if (text) return text;
    
    if (variant === 'email') {
      return status ? 'Sent' : 'Not Sent';
    }
    
    if (!status) return 'Loading...';
    
    return status.replace('_', ' ').toUpperCase();
  };

  return (
    <span style={{
      display: 'inline-block',
      borderRadius: '12px',
      fontWeight: '600',
      textAlign: 'center',
      backgroundColor: getBackgroundColor(),
      color: 'white',
      ...getSizeStyles()
    }}>
      {getDisplayText()}
    </span>
  );
};

export default StatusBadge;
