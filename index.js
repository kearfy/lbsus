//Import libraries
import express from "express";
import { NodeSSH } from 'node-ssh';
import dotenv from 'dotenv';
import fs from 'fs';
import chalk from 'chalk';

//Basic configuration for different services.
dotenv.config()
const app = express();
const port = 3000;
var taskCount = 0;

async function log(device, msg, toConsole = true) {
    if (toConsole) console.log(msg);
    var logFile = './logs/' + device + '.log.txt';
    if (!fs.existsSync(logFile)) {
        try {
            fs.writeFileSync(logFile, '===== START OF LOGS =====');
        } catch (e) {
            console.log(chalk.red('[-]') + " Failed to create logfile for device \"" + device + "\"");
            console.log(chalk.red(e));
            return false;
        }
    }

    fs.appendFileSync(logFile, "\n" + msg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''));
    return true;
}

//Cool little reponse for the root webpage! ;)
app.get('/', (req, res) => {
    res.send('Laptop Management System V1. It\'s alive!');
});

//The actual ping route, validates device name and key / secret.
app.get('/ping/:device/:key', async (req, res) => {
    //Read devices (I don't store them globally, so you can update them without restarting the process)
    let devicesRaw = fs.readFileSync('./devices.json');
    var devices = JSON.parse(devicesRaw);

    //Device / request validation.
    if (devices[req.params.device] && devices[req.params.device].key == req.params.key) {
        //Increase task size, send response to client.
        taskCount++;
        var task = taskCount;
        res.send('OK');

        await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Started task \"" + task + "\".");

        //Connect to client.
        await new Promise(async (resolveSession, rejectSession) => {
            const ssh = new NodeSSH();
            ssh.connect(devices[req.params.device]).then(async () => {
                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Connected to device \"" + req.params.device + "\" via SSH.");

                //Start on repeated scripts.
                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Starting with repeated scripts.");
                await new Promise((resolveScripts, rejectScripts) => {
                    //Read folder for scripts.
                    fs.readdir('./scripts-repeat', async (err, files) => {
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            //Validate file name. Must end with '.sh'.
                            if (file.length > 3 && file.slice(-3) == '.sh') {
                                var scriptName = file.slice(0, -3);
                                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Executing script \"" + scriptName + "\" on device \"" + req.params.device + "\"");
                                
                                //Read script. Execute with 'bash -s' and fed script via stdin.
                                const script = fs.readFileSync('./scripts-repeat/' + file, {encoding:'utf8', flag:'r'});
                                let res = await ssh.execCommand('bash -s', {stdin: script});
                                if (res.code == 0) {
                                    await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.green('[+]') + " Script \"" + scriptName + "\" executed on device \"" + req.params.device + "\"");
                                    await log(req.params.device, "\n" + res.stdout + "\n", false);
                                } else {
                                    await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Script \"" + scriptName + "\" failed on device \"" + req.params.device + "\"");
                                    await log(req.params.device, chalk.red(res.code));
                                    await log(req.params.device, "\n" + chalk.red(res.stdout) + "\n");
                                }
                            }
                        };
        
                        //Finished all repeated scripts!
                        resolveScripts();
                    });
                });

                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished repeated scripts.");
                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Starting with single-run scripts.");

                //Start on single run scripts.
                await new Promise(async (resolveScripts, rejectScripts) => {
                    //Read folder for scripts.
                    fs.readdir('./scripts-once', async (err, files) => {
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            if (file.length > 3 && file.slice(-3) == '.sh') {
                                //Check if lock file exists. Otherwise execute the script.
                                var scriptName = file.slice(0, -3);
                                var lockFile = './scripts-once/finished/' + req.params.device + "__" + scriptName;
                                if (!fs.existsSync(lockFile)) {
                                    //Read script. Execute with 'bash -s' and fed script via stdin.
                                    await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Executing script \"" + scriptName + "\" on device \"" + req.params.device + "\"");
                                    const script = fs.readFileSync('./scripts-once/' + file, {encoding:'utf8', flag:'r'});
                                    let res = await ssh.execCommand('bash -s', {stdin: script});
                                    if (res.code == 0) {
                                        await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.green('[+]') + " Script \"" + scriptName + "\" executed on device \"" + req.params.device + "\"");
                                        await log(req.params.device, "\n" + res.stdout + "\n", false);

                                        //Success! Attempt to create lock file, otherwise show error in console.
                                        try {
                                            fs.writeFileSync(lockFile, '1');
                                        } catch (e) {
                                            await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Failed to create lockfile for script \"" + scriptName + "\" for device \"" + req.params.device + "\"");
                                            await log(req.params.device, chalk.red(e));
                                        }
                                    } else {
                                        await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Script \"" + scriptName + "\" failed on device \"" + req.params.device + "\"");
                                        await log(req.params.device, "\n" + chalk.red(res.stdout) + "\n");
                                    }
                                } else {
                                    await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Script \"" + scriptName + "\" has already executed on device \"" + req.params.device + "\"");
                                }
                            }
                        };

                        //Finished all single-run scripts.
                        resolveScripts();
                    });
                });

                //Disconnect from SSH session and resolve the promise.
                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished single-run scripts.");
                ssh.dispose();
                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Disconnected to device \"" + req.params.device + "\" via SSH.");
                resolveSession();
            }).catch(async e => {
                await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Failed to connect to device \"" + req.params.device + "\"");
                await log(req.params.device, chalk.red(e));
                resolveSession();
            });
        });

        await log(req.params.device, chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished task \"" + task + "\".");
    } else {
        //Invalid request, unauthorized.
        res.status(401);
        res.send("UNAUTHORIZED");
    }
});

//Start listening on the defined port!
app.listen(process.env.PORT || port, () => {
    console.log(chalk.blue('[i]') + ` Server is listening on port ${process.env.PORT || port}`);
});