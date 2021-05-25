var config = require('config');
const path = require('path');
const kp = require("./kafka_producer");
if(process.env.CONFIGPATH){
    var config = require(process.env.CONFIGPATH)

}
// var okta = require("@okta/okta-sdk-nodejs");
//
// var oktaClient = new okta.Client({
//     orgUrl: config.okta.domain,
//     token: config.okta.apiToken
// });



exports.okta = (req, res) => {
    if (req.userContext) {
        res.sendFile(path.join(__dirname + '/public/submitticketcovid.html'));
    } else {
        res.redirect("/");
    }
}

exports.mentalHealth= (req, res) => {
    console.log("MH");
    if (req.userContext) {
        res.sendFile(path.join(__dirname + '/public/submit-mh-ticket.html'));
    } else {
        res.redirect("/");
    }
}

exports.submitTicketCovid = async (req, res) => {
    console.log(req.body);
    console.log("-------");
    console.log(req.userContext.userinfo.FullProfile.state);

    //let user = await  oktaClient.getUser(req.userContext.userinfo.FullProfile);
    //console.log(user.listGroups());


    req.body.ccAgent=req.userContext.userinfo.preferred_username;
    req.body.state=req.userContext.userinfo.FullProfile.state;
    req.body.requestType="covid";

    let payload={};
    payload.id="agentForm"
    payload.body=req.body;
    payload.apiPath=req.originalUrl.split("?")[0];

    req.body=payload;
    let params = new Object();
    params.topic = "agent_form_submissions";
    req.params = params;

    kp.sendMsgWithoutResponse(req,res);

    res.sendFile(path.join(__dirname+'/public/success.html'));
}

exports.submitMHTicket = async (req, res) => {
    console.log(req.body);
    console.log("-------");
    console.log(req.userContext.userinfo.FullProfile.state);

    //let user = await  oktaClient.getUser(req.userContext.userinfo.FullProfile);
    //console.log(user.listGroups());


    req.body.ccAgent=req.userContext.userinfo.preferred_username;
    req.body.state=req.userContext.userinfo.FullProfile.state;
    req.body.requestType="mental_health";

    let payload={};
    payload.id="agentForm"
    payload.body=req.body;
    payload.apiPath=req.originalUrl.split("?")[0];

    req.body=payload;
    let params = new Object();
    params.topic = "agent_form_submissions";
    req.params = params;

    kp.sendMsgWithoutResponse(req,res);

    res.sendFile(path.join(__dirname+'/public/success.html'));
}

//Ozonetel's End Point
exports.logout = (req, res) => {
    req.logout();
    //delete req.session.user;
    res.redirect("/");
}