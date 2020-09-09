let {
    getRandomInt,
    updateLongProcess,
    execShellCommand,
    waitFOrMilis
} = require('./utils');

const Promise = require('bluebird');
const execFile = Promise.promisify(require('child_process').execFile);
const exec = Promise.promisify(require('child_process').exec);
let ncpAsync = Promise.promisify(require('ncp').ncp);
const fs = require('fs');
const fsPromises = fs.promises;
let rimraf = require("rimraf");

let EditorUtils = {};

EditorUtils.prepareEditor = async (path, publisherWebsite, productDetails, addedProducts,
    longProcessData, editorVersion = 1) => 
{
    try {
        let editorGitData = EditorUtils.getSourceFilePath(publisherWebsite, editorVersion);
        let dependencies = publisherWebsite.metadata.dependencies || [];
        let services = publisherWebsite.metadata.services || [];

        let siteDataJsonPath = `${path}/src/data/siteData.json`;
        let servicePortsJsonPath = `${path}/src/data/servicePorts.json`;
        let configJsonPath = `${path}/src/data/config.json`;
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

        await waitFOrMilis(500);

        console.log("Installing required packages ...");
        updateLongProcess(longProcessData, 'Installing required packages ...', "running", {
            progress: 30
        });

        let packageResult = await EditorUtils.installDependencies([]);
        if (!packageResult.success)
            throw new Error(`Can't install package.json for editor: ${packageResult.message}`);

        console.log("Installing extra dependencies ...");
        updateLongProcess(longProcessData, 'Installing extra dependencies ...', "running", {
            progress: 50
        });

        let dependenciesResult = await EditorUtils.installDependencies(dependencies);
        if (!dependenciesResult.success)
            throw new Error(`Can't install dependencies for editor: ${dependenciesResult.message}`);

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

        let packageData = await fsPromises.readFile(packagePath, 'utf8');
        packageData = packageData.replace(/{homepage}/g, homepage);
        await fsPromises.writeFile(packagePath, packageData, 'utf8');
        // await fsPromises.writeFile(siteDataJsonPath, JSON.stringify(publisherWebsite.metadata.siteData), 'utf8');
        await fsPromises.writeFile(servicePortsJsonPath, JSON.stringify(servicePorts), 'utf8');
        await fsPromises.writeFile(configJsonPath, JSON.stringify({
            BaseName: homepage
        }), 'utf8');

        await waitForMilis(500);

        console.log("Building editor ...");
        updateLongProcess(longProcessData, 'Building editor ...', "running", {
            progress: 75
        });

        let buildResult = await EditorUtils.buildProject(path);
        if (!buildResult.success)
            throw new Error(`Can't build editor: ${buildResult.message}`);

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
            url: `${process.env.EDITOR_DOMAIN}${homepage}`
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
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, {recursive: true});
        }

        let command = `git clone ${gitAddress}`;
        let {
            success,
            stdout,
            stderr,
            error
        } = await execShellCommand(command, {
            cwd: path
        });

        if (!success) {
            console.log(error);
            throw new Error("Failed on git clone ...");
        }

        await ncpAsync(`${path}/${projectName}`, path);

        await EditorUtils.removeFolder(`${path}/${projectName}`);

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
                address: 'https://github.com/behroozkhan/test-project.git',
                name: 'test-project'
            };
        case 'service':
            return {
                address: 'https://github.com/behroozkhan/test-project.git',
                name: 'test-project'
            };
        case 'app':
            return {
                address: 'https://github.com/behroozkhan/test-project.git',
                name: 'test-project'
            };
        case 'component':
            return {
                address: 'https://github.com/behroozkhan/test-project.git',
                name: 'test-project'
            };
    }

    return;
}

EditorUtils.getPermissonsFromWebsites = (websites) => {
    // websites: [resourcePlan, ...permissionPlans];
    // TODO return permission array [allowCode, ...] from publisherWebsite.resource
    return [];
}

EditorUtils.installDependencies = async (dependencies) => {
    try {
        let command = 'pnpm install ' + dependencies.join(' ');
        let {
            success,
            stdout,
            stderr,
            error
        } = await execShellCommand(command, {
            cwd: moduleDir
        });

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
        let command = 'npm run build';
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

EditorUtils.publishProject = async (path) => {
    try {
        let command = 'npm run publish';
        let {
            status,
            stdout,
            stderr
        } = await exec(command, {
            cwd: path
        });

        if (status == 0) {
            throw new Error('Publishing failed !!!');
        }

        let projectBasePath = process.env.PROJECT_BASE_PATH;
        let path = projectBasePath.replace(projectBasePath, '');

        return {
            success: true,
            url: `${path}/build`
        };
    } catch (error) {
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