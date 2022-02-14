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

        console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Started task \"" + task + "\".");

        //Connect to client.
        await new Promise((resolveSession, rejectSession) => {
            const ssh = new NodeSSH();
            ssh.connect(devices[req.params.device]).then(async () => {
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Connected to device \"" + req.params.device + "\" via SSH.");

                //Start on repeated scripts.
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Starting with repeated scripts.");
                await new Promise((resolveScripts, rejectScripts) => {
                    //Read folder for scripts.
                    fs.readdir('./scripts-repeat', async (err, files) => {
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            //Validate file name. Must end with '.sh'.
                            if (file.length > 3 && file.slice(-3) == '.sh') {
                                var scriptName = file.slice(0, -3);
                                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Executing script \"" + scriptName + "\" on device \"" + req.params.device + "\"");
                                
                                //Read script. Execute with 'bash -s' and fed script via stdin.
                                const script = fs.readFileSync('./scripts-repeat/' + file, {encoding:'utf8', flag:'r'});
                                let res = await ssh.execCommand('bash -s', {stdin: script});
                                if (res.code == 0) {
                                    console.log(chalk.yellow("T" + task) + ': ' + chalk.green('[+]') + " Script \"" + scriptName + "\" executed on device \"" + req.params.device + "\"");
                                } else {
                                    console.error(chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Script \"" + scriptName + "\" failed on device \"" + req.params.device + "\"");
                                    console.error(chalk.red(res.code));
                                    console.error(chalk.red(res.stdout));
                                }
                            }
                        };
        
                        //Finished all repeated scripts!
                        resolveScripts();
                    });
                });

                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished repeated scripts.");
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Starting with single-run scripts.");

                //Start on single run scripts.
                await new Promise((resolveScripts, rejectScripts) => {
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
                                    console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Executing script \"" + scriptName + "\" on device \"" + req.params.device + "\"");
                                    const script = fs.readFileSync('./scripts-once/' + file, {encoding:'utf8', flag:'r'});
                                    let res = await ssh.execCommand('bash -s', {stdin: script});
                                    if (res.code == 0) {
                                        console.log(chalk.yellow("T" + task) + ': ' + chalk.green('[+]') + " Script \"" + scriptName + "\" executed on device \"" + req.params.device + "\"");

                                        //Success! Attempt to create lock file, otherwise show error in console.
                                        try {
                                            fs.writeFileSync(lockFile, '1');
                                        } catch (e) {
                                            console.error(chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Failed to create lockfile for script \"" + scriptName + "\" for device \"" + req.params.device + "\"");
                                            console.error(chalk.red(e));
                                        }
                                    } else {
                                        console.error(chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Script \"" + scriptName + "\" failed on device \"" + req.params.device + "\"");
                                        console.error(chalk.red(res.stdout));
                                    }
                                } else {
                                    console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Script \"" + scriptName + "\" has already executed on device \"" + req.params.device + "\"");
                                }
                            }
                        };

                        //Finished all single-run scripts.
                        resolveScripts();
                    });
                });

                //Disconnect from SSH session and resolve the promise.
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished single-run scripts.");
                ssh.dispose();
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Disconnected to device \"" + req.params.device + "\" via SSH.");
                resolveSession();
            }).catch(e => {
                console.error(chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Failed to connect to device \"" + req.params.device + "\"");
                console.error(chalk.red(e));
                resolveSession();
            });
        });

        console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished task \"" + task + "\".");
    } else {
        //Invalid request, unauthorized.
        res.status(401);
        res.send("UNAUTHORIZED");
    }
});

//Start listening on the defined port!
app.listen(process.env.PORT, () => {
    console.log(chalk.blue('[i]') + ` Server is listening on port ${process.env.PORT}`);
});