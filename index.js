import EditorUtils from './utils/editorUtils';
import Response from './utils/response';

require('dotenv').config();

let express = require('express');
let app = express();
const appBaseRoute = '/api';

app.post(appBaseRoute + '/request', async (req, res) => {
    let {publisherId, websiteId, publisherWebsite, 
            productDetails, addedProducts, longProcessData} 
        = req.body;
    
    let path = `${process.env.PROJECT_BASE_PATH}/${publisherId}/${websiteId}`;
    res.json(
        new Response(true, {}).json()
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
    let {path} = req.body;

    let result = EditorUtils.publishProject(path);

    if (result.success) {
        res.json(
            new Response(true, {urlToDownload: result.url}).json()
        );
    } else {
        res.status(500).json(
            new Response(false, {error: result.error}, result.error.message).json()
        );
    }
})

app.get(appBaseRoute + '/resourceusage', function (req, res) {
    // TODO return resource useage
})
 
app.listen(process.env.PORT, () => {
    console.log(`Editor worker listening on port ${process.env.PORT}!`);
});