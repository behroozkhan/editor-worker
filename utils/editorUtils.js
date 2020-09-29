let {
    getRandomInt,
    updateLongProcess,
    execShellCommand,
    waitForMilis
} = require('./utils');
let jwt = require('jsonwebtoken');
const Promise = require('bluebird');
const execFile = Promise.promisify(require('child_process').execFile);
const exec = Promise.promisify(require('child_process').exec);
let ncpAsync = Promise.promisify(require('ncp').ncp);
const fs = require('fs');
const fsPromises = fs.promises;
let rimraf = require("rimraf");
var FormData = require('form-data');

let EditorUtils = {};

EditorUtils.prepareEditor = async (path, publisherWebsite, productDetails, addedProducts,
    longProcessData, editorVersion = 1) => 
{
    try {
        let editorGitData = EditorUtils.getSourceFilePath(publisherWebsite, editorVersion);
        let dependencies = publisherWebsite.metadata.dependencies || [];
        let services = publisherWebsite.metadata.services || [];

        let siteDataJsonPath = `${path}/src/data/siteData.json`;
        let servicePortsJsonPath = `${path}/public/static/json/servicePorts.json`;
        let configJsonPath = `${path}/public/static/json/config.json`;
        let packagePath = `${path}/package.json`;

        let homepage = `/${publisherWebsite.publisherId}/${publisherWebsite.endWebsiteId}/build`;

        console.log("Copying editor files ...");
        updateLongProcess(longProcessData, 'Copying editor files ...', "running", {
            progress: 10
        });

        let prepareResult = await EditorUtils.gitClone(
            editorGitData.address, editorGitData.name, path);
        if (!prepareResult.success)
            throw new Error(`Can't prepare editor: ${prepareResult.message}`);

        await waitForMilis(500);

        console.log("Starting services ...");
        updateLongProcess(longProcessData, 'Starting services ...', "running", {
            progress: 60
        });

        let servicePorts = {};
        services.forEach(async (service) => {
            let serviceResult = await EditorUtils.installService(service, path);
            if (!serviceResult.success)
                throw new Error(`Can't install service for editor services: ${serviceResult.message}`);

            servicePorts[service.name] = serviceResult.port;
        });

        console.log("Copying data ...");
        updateLongProcess(longProcessData, 'Copying data ...', "running", {
            progress: 70
        });

        // let packageData = await fsPromises.readFile(packagePath, 'utf8');
        // packageData = packageData.replace(/{homepage}/g, homepage);
        // await fsPromises.writeFile(packagePath, packageData, 'utf8');
        await fsPromises.writeFile(servicePortsJsonPath, JSON.stringify(servicePorts), 'utf8');
        await fsPromises.writeFile(configJsonPath, JSON.stringify({
            BaseName: homepage
        }), 'utf8');

        await waitForMilis(500);

        // console.log("Installing required packages ...");
        // updateLongProcess(longProcessData, 'Installing required packages ...', "running", {
        //     progress: 30
        // });
        // let packageResult = await EditorUtils.installDependencies([], path);
        // if (!packageResult.success)
        //     throw new Error(`Can't install package.json for editor: ${packageResult.message}`);

        if (dependencies.length > 0) {
            console.log("Installing extra dependencies ...");
            updateLongProcess(longProcessData, 'Installing extra dependencies ...', "running", {
                progress: 50
            });

            let dependenciesResult = await EditorUtils.installDependencies(dependencies, path);
            if (!dependenciesResult.success)
                throw new Error(`Can't install dependencies for editor: ${dependenciesResult.message}`);
                console.log("Building editor ...");
                updateLongProcess(longProcessData, 'Building editor ...', "running", {
                    progress: 75
                });
        
            let buildResult = await EditorUtils.buildProject(path);
            if (!buildResult.success)
                throw new Error(`Can't build editor: ${buildResult.message}`);
        }

        let userAccessToken = jwt.sign({
            id: publisherWebsite.endUserId,
            role: 'user'
        }, process.env.JWT_ACCESS_TOKEN_SECRET, {
            expiresIn: '1d'
        });
        let publisherAccessToken = jwt.sign({
            id: publisherWebsite.publisherId,
            role: 'publisher'
        }, process.env.JWT_ACCESS_TOKEN_SECRET, {
            expiresIn: '1d'
        });

        console.log("Editor started successfully");
        updateLongProcess(longProcessData, 'Editor started successfully', "complete", {
            progress: 100,
            userAccessToken,
            publisherAccessToken,
            url: `${process.env.EDITOR_DOMAIN}${homepage}/index.html`,
            longProcessTimeout: 30 * 24 * 60 * 60
        });
    } catch (error) {
        await EditorUtils.deleteEditor(path);

        console.log("Editor failed ...", error);
        updateLongProcess(longProcessData, 'Editor failed ...', "failed", {
            error: JSON.stringify(error)
        });
    }
}

EditorUtils.gitClone = async (gitAddress, projectName, path) => {
    try {
        // TODO make it async in safe way
        console.log("gitClone 1")
        if (!fs.existsSync(path)) 
        {
            console.log("gitClone 2")
            fs.mkdirSync(path, {recursive: true});
        }

        if (fs.existsSync(`${path}/${projectName}`)) {
            console.log("gitClone 2.5")
            await EditorUtils.removeFolder(`${path}/${projectName}`);
        }

        console.log("gitClone 3")
        let command = `git clone ${gitAddress}`;
        let {
            success,
            stdout,
            stderr,
            error
        } = await execShellCommand(command, {
            cwd: path
        });
        console.log("gitClone 4", stdout, stderr)

        if (!success) {
            console.log(error);
            throw new Error("Failed on git clone ...");
        }

        console.log("gitClone 5", path, projectName)
        command = `mv ${path}/${projectName}/* ${path}/`;
        let moveResult = await execShellCommand(command);
        if (!moveResult.success) {
            console.log(moveResult.error);
            throw new Error("Failed on git clone 5 ...");
        }
        console.log("gitClone 6")

        await EditorUtils.removeFolder(`${path}/${projectName}`);
        console.log("gitClone 7")

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

EditorUtils.copyFiles = async (sourceFilePath, path, productDetails, addedProducts) => {
    try {
        // TODO make it async in safe way
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }

        await ncpAsync(sourceFilePath, path);

        // TODO add or remove some files based on permissions

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            message: error.message
        };
    }
}

EditorUtils.deleteEditor = (path) => {
    return new Promise(function (resolve, reject) {
        fs.exists(path, function (exists) {
            if (exists) {
                rimraf(path, function () { 
                    resolve();
                });
            } else {
                resolve();
            }
        })
    })
    
}

EditorUtils.removeFolder = (path) => {
    return new Promise(function (resolve, reject) {
        rimraf(path, function () { 
            resolve();
        });
    })
    
}

EditorUtils.getSourceFilePath = (publisherWebsite, editorVersion) => {
    // let baseFilePath = `/base_files_${editorVersion}`;
    switch (publisherWebsite.type) {
        case 'website':
            return {
                address: 'https://github.com/weblancerir/blank.git',
                name: 'blank'
            };
        case 'service':
            return {
                address: 'https://github.com/weblancerir/blank.git',
                name: 'blank'
            };
        case 'app':
            return {
                address: 'https://github.com/weblancerir/blank.git',
                name: 'blank'
            };
        case 'component':
            return {
                address: 'https://github.com/weblancerir/blank.git',
                name: 'blank'
            };
    }

    return;
}

EditorUtils.getPermissonsFromWebsites = (websites) => {
    // websites: [resourcePlan, ...permissionPlans];
    // TODO return permission array [allowCode, ...] from publisherWebsite.resource
    return [];
}

EditorUtils.installDependencies = async (dependencies, path) => {
    try {
        let command = 'yarn install ' + dependencies.join(' ');
        let {
            success,
            stdout,
            stderr,
            error
        } = await execShellCommand(command, {
            cwd: path
        });

        if (!success) {
            throw new Error(stdout);
        }

        console.log("installDependencies stdout", stdout)

        return {
            success,
            error
        };
    } catch (error) {
        console.log("installDependencies error", error)
        return {
            success: false,
            error,
            message: error.message
        };
    }
}

EditorUtils.installService = async (service, path) => {
    try {
        // TODO copy or install service files to project directory

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error,
            message: error.message
        };
    }
}

EditorUtils.buildProject = async (path) => {
    try {
        let command = 'yarn run build';
        let {
            success,
            stdout,
            stderr,
            error
        } = await execShellCommand(command, {
            cwd: path
        });

        return {
            success,
            error
        };
    } catch (error) {
        return {
            success: false,
            error,
            message: error.message
        };
    }
}

EditorUtils.publishProject = async (path, folder, targetUrl, publisherWebsite, username, 
    domainConfig, longProcessData) => {
    try {
        let command = `zip -r siteZip.zip ${path}/${folder}`;
        let result = await execShellCommand(command, {
            cwd: path
        });

        if (!result.success) {
            console.log("Failed on zipping", result.error, result.stderr)
            throw new Error('Failed on zipping !!!');
        }

        let body = {
            username,
            websiteName: publisherWebsite.name,
            userId: publisherWebsite.endUserId,
            publisherId: publisherWebsite.publisherId,
            domainConfig,
            metadata: publisherWebsite.metadata,
            longProcessData
        };
        
        // Send zip file to targetUrl
        let form = new FormData();
        Object.keys(body).forEach(key => {
            form.append([key], data[key]);
        });
        form.append("siteZip", fs.createReadStream(`${path}/siteZip.zip`));

        let response = await axios.post(targetUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
        });

        console.log("publishProject response", response);

        return {
            success: true,
            publishData: response.data.data
        };
    } catch (error) {
        console.log("Error publishProject", error)
        return {
            success: false,
            error,
            message: error.message
        };
    }
}

EditorUtils.heartbeat = async (path) => {
    try {
        let fullPath = `${path}/heartbeat.json`;

        await fsPromises.writeFile(fullPath, getRandomInt(0, 100));

        return true;
    } catch (error) {
        return false;
    }
}

module.exports = EditorUtils;