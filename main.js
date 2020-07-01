const express = require('express');
const app = express();

app.set('view engine','ejs');

app.use(express.static('public'));

app.get('/', (req,res)=>{
    res.render('home');
});

app.listen(8000, (err)=>{
    if(err) throw err;
    console.log('To do app running on port 8000');
});