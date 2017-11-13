'use strict';
var express = require('express');
var router = express.Router();


router.get('/', (req, res, next) => {
    
    
    res.render('index', {});
});

router.post('/', (req, res, next) => {
    //TODO
    
    res.render('index', {});
});

module.exports = router;