'use strict';
var express = require('express');
var router = express.Router();

router.get('/', (req, res, next) => {
    res.render('index', {});
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
