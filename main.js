const express = require('express');
const app = express();

let port = process.env.PORT || 8000;

app.set('view engine','ejs');

app.use(express.static('public'));

app.get('/', (req,res)=>{
    res.render('home');
});

app.listen(port, (err)=>{
    if(err) throw err;
    console.log('To do app running on port '+port);
});