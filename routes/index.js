'use strict';
var express = require('express');
var router = express.Router();

router.get('/', (req, res, next) => {
    if (express().get('env') === 'development') {
        var url = 'https://node-study-kfjmr0.c9users.io:8080/';
    } else {
        var url = 'https://node-study-kfjmr0.c9users.io:8080/';
    }
    res.render('index', {url: url});
});

router.get('/howTo', (req, res, next) => {
    res.render('howTo', {});
});

router.get('/changeLog', (req, res, next) => {
    res.render('changeLog', {});
});

router.get('/material', (req, res, next) => {
    res.render('material', {});
});

module.exports = router;
