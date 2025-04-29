import React, { useEffect } from 'react';

const DebugOverlay = () => {
  useEffect(() => {
    // Función para eliminar específicamente la línea blanca
    const fixWhiteLine = () => {
      document.body.style.borderBottom = 'none';
      document.documentElement.style.borderBottom = 'none';
      document.getElementById('root').style.borderBottom = 'none';
      
      // Forzar el color de fondo en todo el documento
      document.body.style.backgroundColor = '#0a192f';
      document.documentElement.style.backgroundColor = '#0a192f';
      document.getElementById('root').style.backgroundColor = '#0a192f';
    };
    
    // Ejecutar después de que el DOM esté completamente cargado
    setTimeout(fixWhiteLine, 1000);
  }, []);
  
  return null; // Este componente no renderiza nada visible
};

export default DebugOverlay;
