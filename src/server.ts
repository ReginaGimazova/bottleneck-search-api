import app from './app';
console.log(process.env.PORT)
const PORT = process.env.PORT || 8080;

app.listen(PORT);
