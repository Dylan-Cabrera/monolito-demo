require('dotenv').config();
const { validarSecreto } = require('./config');

// Con un secreto débil cualquiera puede falsificar la cookie de sesión: en producción no se arranca.
const error = validarSecreto();
if (error) { console.error(`No se puede iniciar Canto de Hornero: ${error}`); process.exit(1); }

const app = require('./app');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Canto de Hornero en http://localhost:${port}`));
