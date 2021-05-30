const express = require('express');
const kafka = require('kafka-node');
const app = express();
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');

// IVR Clients
const providerCallbackHandlers = require("./functions");
const agentForm = require("./agentform");

var config = require('./config/default.json');
if(process.env.CONFIGPATH){
    var config = require(process.env.CONFIGPATH);
}
// Express App Configuration
app.use(cookieParser());
app.use(express.static('public'));
app.use(express.json());            // to support JSON-encoded bodies
app.use(express.urlencoded({        // to support URL-encoded bodies
extended: true
}));
app.use(session({
    secret: "Project StepOne",
    resave: true,
    saveUninitialized: false
}));

enable_okta = config.okta.enabled == "true" ? true :false;

var oidc;

// ExpressOIDC attaches handlers for the /login and /authorization-code/callback routes
if (enable_okta) { 
    oidc = new ExpressOIDC({
        issuer: config.okta.domain + "/oauth2/default",
        client_id: config.okta.clientId,
        client_secret: config.okta.clientSecret,
        loginRedirectUri: config.okta.host + "/authorization-code/callback",
        appBaseUrl: config.okta.host,
        scope: 'openid profile'
    });
    
    app.use(oidc.router);
}
// Kafka Producer Configuration
const Producer = kafka.Producer;
const host = config.kafka.host.toString();
const client = new kafka.KafkaClient({
    kafkaHost: host
});
const producer = new Producer(client, {
    partitionerType: 1
});

//Producer States
producer.on('ready', function () {
    console.log('Producer is ready');
});
producer.on('error', function (err) {
    console.log('Producer is in error state');
    console.log(err);
});

//Listening to Port
if (enable_okta){
    oidc.on('ready', () => {
        app.listen(5001, function () {
            console.log('Kafka producer running at 5001');
        });
    });
} else {
    app.listen(5001, function () {
        console.log('Kafka producer running at 5001');
    });
}

//Message Ingestion Functions
exports.sendBulkMsg = async (req, res) => {

    const topic = req.params.topic;
    console.log("Topic: ", topic);

    const messageBody = JSON.stringify(req.body);
    console.log("Message Body: ", messageBody);

    const payloads = [];
    const messages = req.body.messages;

    while (messages.length) {
        var message = messages.pop();
        var payload = {
            topic: topic,
            key: message['partitionKey'].toString(),
            messages: JSON.stringify(message['message'])
        };
        console.log("Payload: ", payload);
        payloads.push(payload);
    }

    producer.send(payloads, function (err, data) {
        if (err) {
            console.log("[ERROR] ", err);
            return res.status(500).json(err);
        }

        console.log("[DATA] ", data);
        return res.sendStatus(200);
    });
};

exports.sendMsg = async (req, res) => {

    const payloads = getKafkaPayload(req);

    producer.send(payloads, function (err, data) {
        if (err) {
            console.log("[ERROR] ", err);
            return res.status(500).json(err);
        }

        console.log("[DATA] ", data);
        return res.json(data);
    });
};

exports.sendPlasmaMsg = async (req, res) => {

    const payloads = getKafkaPayload(req);

    producer.send(payloads, function (err, data) {
        if (err) {
            console.log("[ERROR] ", err);
            res.render('problem.ejs');
        }

        console.log("[DATA] ", data);
        res.render('thanks.ejs');
    });
};

exports.sendMsgWithoutResponse = async (req, res) => {

    const payloads = getKafkaPayload(req);

    producer.send(payloads, function (err, data) {
        if (err) {
            console.log("[ERROR] ", err);
            return res.status(500).json(err);
        }

        console.log("[DATA] ", data);
    });
};

exports.sendCallBack = async (req, res) => {

    const payloads = getKafkaPayload(req);

    producer.send(payloads, function (err, data) {
        if (err) {
            console.log("[ERROR] ", err);
            return res.sendStatus(500);
        }

        console.log("[DATA] ", data);
        return res.sendStatus(200);
    });
};

exports.sendExotelMsg = async (req, res) => {
    
    const payloads = getKafkaPayload(req);

    if (req.query['digits'].toString() === '"7"' && req.query['Question'] == '7') {
        return res.sendStatus(403);
    } else {
        producer.send(payloads, function (err, data) {
            if (err) {
                console.log("[ERROR] ", err);
                return res.status(500).json(err);
            } else {
                console.log("[DATA] ", data);
                return res.sendStatus(201);
            }
        });
    }
};

function getKafkaPayload(req) {

    const topic = req.params.topic;
    console.log("Topic: ", topic);

    const messageBody = JSON.stringify(req.body);
    console.log("Message Body: ", messageBody);

    return [{
        topic: topic, 
        messages: messageBody
    }];
};

// App Routes
if (enable_okta === true) {
    app.get('/', oidc.ensureAuthenticated(), agentForm.okta);
    app.get('/mental-health', oidc.ensureAuthenticated(), agentForm.mentalHealth);
    app.get('/authorization-code/callback', oidc.ensureAuthenticated(), agentForm.okta);
    app.get('/logout', oidc.forceLogoutAndRevoke(), agentForm.logout);
    app.post('/submit-ticket',  oidc.ensureAuthenticated(), agentForm.submitTicketCovid);
    app.post('/submit-ticket-mh',  oidc.ensureAuthenticated(), agentForm.submitMHTicket);
} else {
    app.get('/',  agentForm.okta);
    app.get('/mental-health',  agentForm.mentalHealth);
    app.get('/authorization-code/callback', agentForm.okta);
    app.get('/logout', agentForm.logout);
    app.post('/submit-ticket', agentForm.submitTicketCovid);
    app.post('/submit-ticket-mh', agentForm.submitMHTicket);
}

app.post('/sendBulkMsg/:topic', exports.sendBulkMsg);
app.post('/sendMsg/:topic', exports.sendMsg);

app.get('/ivrhandler/kaleyra', providerCallbackHandlers.kaleyra);
app.get('/ivrhandler/ozonetel', providerCallbackHandlers.ozonetel);
app.get('/ivrhandler/exotel', providerCallbackHandlers.exotel);
app.get('/freshdeskhandler', providerCallbackHandlers.freshdesk);
app.get('/tarshandler', providerCallbackHandlers.hellotars);

app.post('/callbacks/:providerid', providerCallbackHandlers.callbackshandle);
app.post('/corona2telemeds', providerCallbackHandlers.corona2telemeds);
app.post('/obd/:providerid', providerCallbackHandlers.obdhandle);

app.get('/dbp/:uuid',providerCallbackHandlers.delhiPlasmaBankHandler);

app.get('/tickethandler/freshdesk/wfcreate', providerCallbackHandlers.freshdeskTicketWfCreationHandler);

app.get('/messagehandler/:providerid/:apikey', providerCallbackHandlers.providerMessageHandler);
app.post('/rawdata/:providerId/:apikey', providerCallbackHandlers.rawdata);
