const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Eyewitness Cam API running on http://localhost:${PORT}`);
});
