/* eslint-env node */

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var isMac = process.platform === 'darwin';

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function(req, res) {
	res.json({ message: 'hooray! welcome to our api!' });
});

router.post('/',function(req,res){
    switch (req.body.action) {
    case 'getAllDownloads':
        var data = [];
        for (var i=0; i<10; i++){
            data.push({
                id: Math.random(),
                studyId:(0|Math.random()*9e6).toString(36),
                studyUrl:(0|Math.random()*9e6).toString(36),
                db: Math.random() > 0.5 ? 'production' : 'development',
                fileSize: Math.random() < 0.5 ? '' : '12Kb',
                creationDate:new Date(new Date() * Math.random()),
                startDate:new Date(new Date() * Math.random()),
                endDate:new Date(new Date() * Math.random()),
                studyStatus: ['R','C','X'][Math.floor(Math.random()*3)]
            });
        }

    	res.json(data);
        break;
    case 'download':
        res.json({error:'true', msg:'download error'});
        break;
    case 'removeDownload':
        res.json({error:'true', msg:'remove error'});
        break;
    }
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /dashboard
app.use('/dashboard/DashboardData', router);
app.use(express.static('..'));

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
