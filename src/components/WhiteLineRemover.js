import React, { useEffect } from 'react';

const WhiteLineRemover = () => {
  useEffect(() => {
    // Función para crear un elemento que cubra la línea blanca
    const createCoverElement = () => {
      // Eliminar cualquier elemento anterior
      const existingCover = document.getElementById('white-line-cover');
      if (existingCover) {
        existingCover.remove();
      }
      const existingBorderCover = document.getElementById('border-cover');
      if (existingBorderCover) {
        existingBorderCover.remove();
      }
      
      // Crear un nuevo elemento
      const cover = document.createElement('div');
      cover.id = 'white-line-cover';
      cover.style.position = 'fixed';
      cover.style.bottom = '0';
      cover.style.left = '0';
      cover.style.width = '100%';
      cover.style.height = '20px'; // Aumentado a 20px para cubrir mejor
      cover.style.backgroundColor = '#071426'; // Color más oscuro que el fondo
      cover.style.zIndex = '9999'; // Asegurar que esté por encima de todo
      
      // Crear un segundo elemento para cubrir posibles líneas en los bordes
      const borderCover = document.createElement('div');
      borderCover.id = 'border-cover';
      borderCover.style.position = 'fixed';
      borderCover.style.bottom = '0';
      borderCover.style.left = '0';
      borderCover.style.right = '0';
      borderCover.style.height = '100%';
      borderCover.style.width = '100%';
      borderCover.style.border = '0';
      borderCover.style.boxSizing = 'border-box';
      borderCover.style.pointerEvents = 'none'; // Para que no interfiera con los clics
      borderCover.style.zIndex = '9998';
      
      // Añadir al cuerpo del documento
      document.body.appendChild(cover);
      document.body.appendChild(borderCover);
    };
    
    // Ejecutar después de que el DOM esté completamente cargado
    createCoverElement();
    
    // También ejecutar cuando la ventana cambie de tamaño
    window.addEventListener('resize', createCoverElement);
    
    // Limpiar al desmontar
    return () => {
      window.removeEventListener('resize', createCoverElement);
      const cover = document.getElementById('white-line-cover');
      if (cover) {
        cover.remove();
      }
      const borderCover = document.getElementById('border-cover');
      if (borderCover) {
        borderCover.remove();
      }
    };
  }, []);
  
  return null; // Este componente no renderiza nada visible
};

export default WhiteLineRemover;
