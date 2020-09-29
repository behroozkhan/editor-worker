let Response = require('./utils/response');
const EditorUtils = require('./utils/editorUtils');

require('dotenv').config();

let express = require('express');
const { updateLongProcess } = require('./utils/utils');
let app = express();
app.use(express.json());
const appBaseRoute = '/api';

app.post(appBaseRoute + '/request', async (req, res) => {
    let {publisherId, websiteId, publisherWebsite, 
            productDetails, addedProducts, longProcessData} 
        = req.body;
    
    let path = `${process.env.PROJECT_BASE_PATH}/${publisherId}/${websiteId}`;
    res.json(
        new Response(true, {}, "Preparing Editor ...").json()
    );

    console.log("Preparing Editor ...");
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

app.post(appBaseRoute + '/publish', function (req, res) {
    let {targetUrl, publisherWebsite, username, domainConfig, longProcessData} = req.body;
    console.log("publish", targetUrl, username, domainConfig);
    
    let path = `${process.env.PROJECT_BASE_PATH}/${publisherWebsite.publisherId}/${publisherWebsite.websiteId}`;

    let result = EditorUtils.publishProject(path, 'build', targetUrl, publisherWebsite, username, 
        domainConfig, longProcessData);

    if (result.success) {
        res.json(
            new Response(true, {urlToDownload: result.url}).json()
        );
    } else {
        updateLongProcess(longProcessData, 'Files recieved by host ...', "failed", {
            error: result.error
        });
        res.status(500).json(
            new Response(false, {error: result.error}, result.errorge).json()
        );
    }
})

app.get(appBaseRoute + '/resourceusage', function (req, res) {
    // TODO return resource useage
})
 
app.listen(process.env.PORT, () => {
    console.log(`Editor worker listening on port ${process.env.PORT}!`);
});