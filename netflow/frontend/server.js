const express = require('express');
const path = require('path');
const app = express();

// Servir archivos estáticos
app.use(express.static(__dirname));

// Ruta para el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para cualquier otra página
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

app.listen(3000, () => {
    console.log('Servidor frontend corriendo en http://localhost:3000');
});
