let Response = require('./utils/response');
const EditorUtils = require('./utils/editorUtils');

require('dotenv').config();

let express = require('express');
const { updateLongProcess } = require('./utils/utils');
let app = express();
app.use(express.json({ limit: "50mb" }));
const appBaseRoute = '/api';

app.post(appBaseRoute + '/request', async (req, res) => {
    console.log("Preparing Editor 1 ...");
    let {publisherId, websiteId, publisherWebsite, 
            productDetails, addedProducts, longProcessData} 
        = req.body;
    
    let path = `${process.env.PROJECT_BASE_PATH}/${publisherId}/${websiteId}`;
    res.json(
        new Response(true, {}, "Preparing Editor ...").json()
    );

    console.log("Preparing Editor 2 ...");
    await EditorUtils.prepareEditor(
        path, publisherWebsite, productDetails, addedProducts, longProcessData,);
})

app.post(appBaseRoute + '/heartbeat', function (req, res) {
    let {path} = req.body;

    let success = EditorUtils.heartbeat(path);

    if (success) {
        res.json(
            new Response(true, {path}).json()
        );
    } else {
        res.status(500).json(
            new Response(false, {path}, `Can't heartbeat project`).json()
        );
    }
})

app.post(appBaseRoute + '/installpackage', function (req, res) {
    let {dependencies} = req.body;

    let result = EditorUtils.installDependencies(dependencies);

    if (result.success) {
        res.json(
            new Response(true, {dependencies}).json()
        );
    } else {
        res.status(500).json(
            new Response(false, {error: result.error}, result.message).json()
        );
    }
})

app.post(appBaseRoute + '/installservice', function (req, res) {
    let {service, path} = req.body;

    let result = EditorUtils.installService(service, path);

    if (result.success) {
        res.json(
            new Response(true, {dependencies}).json()
        );
    } else {
        res.status(500).json(
            new Response(false, {error: result.error}, result.message).json()
        );
    }
})

app.post(appBaseRoute + '/build', function (req, res) {
    let {path} = req.body;

    let result = EditorUtils.buildProject(path);

    if (result.success) {
        res.json(
            new Response(true, {path}).json()
        );
    } else {
        res.status(500).json(
            new Response(false, {error: result.error}, result.message).json()
        );
    }
})

app.post(appBaseRoute + '/publish', async function (req, res) {
    let {targetUrl, publisherWebsite, username, domainConfig, longProcessData} = req.body;
    console.log("publish", targetUrl, username, domainConfig);
    
    let path = `${process.env.PROJECT_BASE_PATH}/${publisherWebsite.publisherId}/${
        publisherWebsite.endWebsiteId}`;

    let result = await EditorUtils.publishProject(path, 'build', targetUrl, publisherWebsite, username, 
        domainConfig, longProcessData);

    if (result.success) {
        console.log("Publish Success");
        res.json(
            new Response(true, result.data).json()
        );
    } else {
        console.log("Publish Failed", result);
        updateLongProcess(longProcessData, 'Files recieved by host ...', "failed", {
            // error: result.error
        });
        res.status(500).json(
            new Response(false, {error: result.error}, result.error).json()
        );
    }
})

app.get(appBaseRoute + '/resourceusage', function (req, res) {
    // TODO return resource useage
})
 
app.listen(process.env.PORT, () => {
    console.log(`Editor worker listening on port ${process.env.PORT}!`);
});