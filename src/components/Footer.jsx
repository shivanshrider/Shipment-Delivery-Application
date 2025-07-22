import React from 'react';

export default function Footer() {
  return (
    <footer style={{
      background: '#f5f5f5',
      color: '#333',
      padding: '32px 0 16px 0',
      textAlign: 'center',
      fontFamily: 'Poppins, Arial, sans-serif',
      borderTop: '1px solid #e0e0e0',
      marginTop: 'auto',
    }}>
      <div style={{ marginBottom: 12 }}>
        <strong>© 2025 <a href="https://www.celebaltech.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'none' }}>Celebal Technologies</a></strong>
      </div>
      <div style={{ marginBottom: 8 }}>
        Developed as part of the <b>Celebal Summer Internship CSI'25 Program</b>
      </div>
    </footer>
  );
} 