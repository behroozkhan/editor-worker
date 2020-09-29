const axios = require('axios');
const Promise = require('bluebird');
const exec = require('child_process').exec;
const fs = require('fs');
const concat = require("concat-stream");

module.exports.getRandomInt = function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports.updateLongProcess = function updateLongProcess({longProcessUrl, longProcessToken, longProcessId}, status, state, metaData) {
    axios({
        method: 'post',
        url: longProcessUrl,
        data: {
            longProcessId,
            status,
            state,
            metaData
        },
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${longProcessToken}`
        }
    }).then(res => {}).catch(error => {
        console.log("update long process error: ", error);
    });
};

module.exports.existsAsync = function existsAsync(path) {
    return new Promise(function (resolve, reject) {
        fs.exists(path, function (exists) {
            resolve(exists);
        })
    })
}

module.exports.waitForMilis = function waitForMilis(milis) {
    return new Promise(function (resolve, reject) {
        setTimeout(() => {
            resolve();
        }, milis);
    })
}

module.exports.execShellCommand = function execShellCommand(cmd, config) {
    return new Promise((resolve, reject) => {
        exec(cmd, config, (error, stdout, stderr) => {
            let success = !(error);
            resolve({
                success,
                stdout,
                stderr,
                error
            });
        });
    });
}

module.exports.spawnAsync = function spawnAsync(cmd, args, options, unref) {
    return new Promise((resolve, reject) => {
        const ls = spawn(cmd, args, options);

        let resolved = false;
        let out = "";
        let err = "";
        ls.stdout.on('data', (data) => {
            out += data;
        });

        ls.stderr.on('data', (data) => {
            err += data;
        });

        ls.on('error', (error) => {
            resolved = true;
            resolve({
                success: false,
                stdout: out,
                stderr: err,
                error: error
            });
        });

        ls.on("close", code => {
            resolved = true;
            resolve({
                success: true,
                stdout: out,
                stderr: err
            });
        });

        setTimeout(() => {
            if (!resolved)
                resolve({
                    success: true,
                    stdout: out,
                    stderr: err
                });
        }, 4000);

        if (unref)
            ls.unref();
    });
}

module.exports.waitFOrMilis = function waitForMilis(milis) {
    return new Promise(function (resolve, reject) {
        setTimeout(() => {
            resolve();
        }, milis);
    })
}

module.exports.concatFormData = (form) => {
    return new Promise((resolve) => {
        form.pipe(concat({ encoding: 'buffer' }, data => resolve({ data, headers: form.getHeaders() })));
    });
}