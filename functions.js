const kp = require('./kafka_producer');
const got = require('got');
const FormData = require('form-data');
const { URL } = require('url');

var config = require('config');
if (process.env.CONFIGPATH) {
    var config = require(process.env.CONFIGPATH)
}

//Kaleyra's End Point
exports.kaleyra = (req, res) => {

    //Authenticate
    if (!req.query || req.query.api_key != config.kaleyra.api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    } else {
        delete req.query.api_key;
    }
    console.log("Query: ", JSON.stringify(req.query));
 
    if (Object.keys(req.query).length === 0 && req.query.constructor === Object) {
        return res.status(400).send({ errorMessage: "Questionnaire as Query Params Required" });
    }

    var parsedUrl = getParsedUrl(req);
    req.body['queryString'] = parsedUrl.search;
    req.body['apiPath'] = parsedUrl.pathname;
    req.body['id'] = "kaleyra";

    let params = new Object();
    params.topic = "ivr_callbacks";
    req.params = params;

    return kp.sendMsg(req, res);
};

//Ozonetel's End Point
exports.ozonetel = (req, res) => {

    //Authenticate
    if (!req.query || req.query.auth != config.ozonetel.api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    } else {
        delete req.query.auth;
    }

    //Required Parameters
    if (!req.query.number) {
        return res.status(400).send({ errorMessage: "Caller Phone Number Required" });
    }

    var parsedUrl = getParsedUrl(req);
    req.body['queryString'] = parsedUrl.search;
    req.body['apiPath'] = parsedUrl.pathname;
    req.body['id'] = "ozonetel";

    let params = new Object();
    params.topic = "ivr_callbacks";
    req.params = params;

    return kp.sendMsg(req, res);
};

//Exotel endpoint
exports.exotel = (req, res) => {

    //Authenticate
    if (!req.query || req.query.auth != config.exotel.api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    } else {
        delete req.query.auth;
    }
    console.log("Query: ", JSON.stringify(req.query));
    
    if (Object.keys(req.query).length === 0 && req.query.constructor === Object) {
        return res.status(400).send({ errorMessage: "Questionnaire as Query Params Required" });
    }

    var parsedUrl = getParsedUrl(req);
    req.body['queryString'] = parsedUrl.search;
    req.body['apiPath'] = parsedUrl.pathname;
    req.body['id'] = "exotel";

    let params = new Object();
    params.topic = "ivr_callback_step";
    req.params = params;

    return kp.sendExotelMsg(req, res);
};

exports.callbackshandle = (req, res) => {

    var bodyobj = {};
    bodyobj['apiPath'] = req.originalUrl;
    bodyobj['body'] = JSON.parse(JSON.stringify(req.body));
    bodyobj['id'] = req.params.providerid.toString();
    delete req.body;
    req.body = bodyobj;
    let params = new Object();
    params.topic = "provider_callbacks";
    req.params = params;
    return kp.sendCallBack(req, res);
};

exports.corona2telemeds = (req, res) => {

    var bodyobj = {};
    bodyobj['apiPath'] = "corona2telemeds";
    bodyobj['body'] = JSON.parse(JSON.stringify(req.body));
    bodyobj['id'] = "coronawarriors";
    delete req.body;
    req.body = bodyobj;
    let params = new Object();
    params.topic = "coronawarriors";
    req.params = params;
    return kp.sendCallBack(req, res);
};

exports.freshdesk = (req, res, next) => {

    if (!req.query || req.query.api_key != config.freshdesk.api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    }

    if (!req.query.requester || !req.query.attendee) {
        res.render('broken.ejs');
        return undefined;
    }

    if (req.query.state && config.kaleyra_apicallback[req.query.state.toLowerCase()]) {
        kaleyrahandler(req, res, req.query.state.toLowerCase());
    } else {
        exotelhandler(req, res);
    }
};

async function kaleyrahandler(req, res, state) {

    try {
        //POST call with relevant bridge if Attendee is from abroad
        //API Doc: https://developers.kaleyra.io/docs/click-to-call-api

        //Role to Bridge Number mapping saved in config
        if(state == 'abroad') {
            var url = "https://api.kaleyra.io/v1/" + config.kaleyra.sid + "/voice/click-to-call";

            //All Numbers need to have this format: ISD + Number
            //Freshdesk does not send number with ISD Code
            var post_body = {
                "from": config.kaleyra[req.query.role].isd + req.query.attendee,
                "to": '+91' + req.query.requester,                  //Assuming Requester is always from India
                "bridge": config.kaleyra[req.query.role].bridge     //Error will be caught for no Role
            }
            var post_headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                "api-key": config.kaleyra_apicallback[state]
            }

            let response = await got.post(url, { headers: post_headers, form: post_body });
            console.log("body----------", response.body);
        }
        else {
            var url = "https://api-voice.kaleyra.com/v1/?api_key=" + config.kaleyra_apicallback[state] + "&method=dial.click2call&caller=" + req.query.attendee + "&receiver=" + req.query.requester;
            let response = await got(url);
            console.log("body----------", response.body);
        }

        res.render('success.ejs');
    } catch (error) {
        res.render('error.ejs');
        console.log(error.response.body);
    }
};

async function exotelhandler(req, res) {
    
    var url = 'https://' + config.exotelcallback.apikey + ':' + config.exotelcallback.api_token + config.exotelcallback.subdomain + '/v1/Accounts/' + config.exotelcallback.sid + '/Calls/connect';

    let form = new FormData();
    form.append("From", req.query.attendee);
    form.append("To", req.query.requester);
    form.append("CallerId", config.exotelcallback.callerId);

    try {
        let response = await got.post(url, { body: form });
        res.render('success.ejs');
        console.log("body----------", response.body);
    } catch (error) {
        res.render('error.ejs');
        console.log(error.response.body);
    }
};

exports.hellotars = (req, res) => {

    if (!req.query || req.query.api_key != config.hellotars.api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    } else {
        delete req.query.api_key;
    }
    console.log("Query: " + req.query);

    let payload = {};
    payload.id = "tarsbot";
    payload.body = req.query;
    payload.apiPath = "tarsbot";

    req.body = payload;
    let params = new Object();
    params.topic = "tarsbot";
    req.params = params;

    return kp.sendCallBack(req, res);
};

exports.obdhandle = (req, res) => {
    var bodyobj = {};
    bodyobj['apiPath'] = req.originalUrl;
    bodyobj['body'] = JSON.parse(JSON.stringify(req.body));
    bodyobj['id'] = req.params.providerid.toString();
    delete req.body;
    req.body = bodyobj;
    let params = new Object();
    params.topic = "obd_callbacks";
    req.params = params;
    return kp.sendCallBack(req, res);
};

exports.delhiPlasmaBankHandler = (req, res) => {

    console.log("Callback Id: " + req.params.uuid);

    var parsedUrl = getParsedUrl(req);
    req.body['queryString'] = req.params.uuid ? parsedUrl.search + 'callbackId=' + req.params.uuid : '';
    req.body['apiPath'] = parsedUrl.pathname;
    req.body['id'] = "dbp";

    let params = new Object();
    params.topic = "ivr_callbacks";
    req.params = params;

    return kp.sendPlasmaMsg(req, res);
};

exports.rawdata = (req, res) => {
    
    var bodyobj = {};
    bodyobj['apiPath'] = req.originalUrl;
    bodyobj['body'] = JSON.parse(JSON.stringify(req.body));
    bodyobj['id'] = req.params.providerid.toString();
    delete req.body;
    req.body = bodyobj;
    let params = new Object();
    params.topic = "rawdata_handler";
    req.params = params;
    return kp.sendCallBack(req, res);
};

//FreshDesk Workflow Creation Endpoint
exports.freshdeskTicketWfCreationHandler = (req, res) => {

    //Authenticate
    if (!req.query || req.query.api_key != config.freshdesk_wfcreate_handler.api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    } else {
        delete req.query.api_key;
    }
    console.log("Query: ", JSON.stringify(req.query));

    if (Object.keys(req.query).length === 0 && req.query.constructor === Object) {
        return res.status(400).send({ errorMessage: "Ticket Details required as Query Params" });
    }

    var parsedUrl = getParsedUrl(req);
    req.body['queryString'] = parsedUrl.search;
    req.body['apiPath'] = parsedUrl.pathname;
    req.body['id'] = "freshdesk";

    let params = new Object();
    params.topic = "freshdesk_wfcreate_handler";
    req.params = params;

    return kp.sendMsg(req, res);
};

// Provider Message Handler Workflow (Whatsapp, SMS, Telegram etc...)
exports.providerMessageHandler = (req, res) => {

    if (req.params.apikey != config.message_handler[req.params.providerid].api_key.toString()) {
        return res.status(403).send({ errorMessage: "Unauthorized Access" });
    }

    console.log("Query: ", JSON.stringify(req.query));

    if (Object.keys(req.query).length === 0 && req.query.constructor === Object) {
        return res.status(400).send({ errorMessage: "Message Details required as Query Params" });
    }

    var parsedUrl = getParsedUrl(req);
    req.body['queryString'] = parsedUrl.search;
    req.body['apiPath'] = parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/'));
    req.body['id'] = req.params.providerid.toString();

    let params = new Object();
    params.topic = "message_handler";
    req.params = params;

    return kp.sendMsg(req, res);
};

function getParsedUrl(req) {
    return new URL(req. protocol + "://" + req.get('host') + req.originalUrl);
};
