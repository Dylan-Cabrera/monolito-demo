require('dotenv').config();
const app = require('./app');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Canto de Hornero en http://localhost:${port}`));
