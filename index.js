import express from "express";
import { NodeSSH } from 'node-ssh';
import dotenv from 'dotenv';
import fs, { fstat } from 'fs';
import chalk from 'chalk';

dotenv.config()
const app = express();
const port = 3000;
var taskCount = 0;

app.get('/', (req, res) => {
    res.send('Laptop Management System V1. It\'s alive!');
});

app.get('/ping/:device/:key', async (req, res) => {
    let devicesRaw = fs.readFileSync('./devices.json');
    var devices = JSON.parse(devicesRaw);

    if (devices[req.params.device] && devices[req.params.device].key == req.params.key) {
        taskCount++;
        var task = taskCount;
        res.send('OK');

        console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Started task \"" + task + "\".");

        await new Promise((resolveSession, rejectSession) => {
            const ssh = new NodeSSH();
            ssh.connect({
                host: devices[req.params.device].host,
                username: devices[req.params.device].username,
                password: devices[req.params.device].password
            }).then(async () => {
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Connected to device \"" + req.params.device + "\" via SSH.");

                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Starting with repeated scripts.");
                await new Promise((resolveScripts, rejectScripts) => {
                    fs.readdir('./scripts-repeat', async (err, files) => {
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            if (file.length > 3 && file.slice(-3) == '.sh') {
                                var scriptName = file.slice(0, -3);
                                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Executing script \"" + scriptName + "\" on device \"" + req.params.device + "\"");
                                
                                const script = fs.readFileSync('./scripts-repeat/' + file, {encoding:'utf8', flag:'r'});
                                let res = await ssh.execCommand('bash -s', {stdin: script});
                                if (res.code == 0) {
                                    console.log(chalk.yellow("T" + task) + ': ' + chalk.green('[+]') + " Script \"" + scriptName + "\" executed on device \"" + req.params.device + "\"");
                                } else {
                                    console.error(chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Script \"" + scriptName + "\" failed on device \"" + req.params.device + "\"");
                                    console.error(chalk.red(res.stdout));
                                }
                            }
                        };
        
                        resolveScripts();
                    });
                });

                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished repeated scripts.");
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Starting with single-run scripts.");

                await new Promise((resolveScripts, rejectScripts) => {
                    fs.readdir('./scripts-once', async (err, files) => {
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            if (file.length > 3 && file.slice(-3) == '.sh') {
                                var scriptName = file.slice(0, -3);
                                var lockFile = './scripts-once/finished/' + req.params.device + "__" + scriptName;
                                if (!fs.existsSync(lockFile)) {
                                    console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Executing script \"" + scriptName + "\" on device \"" + req.params.device + "\"");
                                    const script = fs.readFileSync('./scripts-once/' + file, {encoding:'utf8', flag:'r'});
                                    let res = await ssh.execCommand('bash -s', {stdin: script});
                                    if (res.code == 0) {
                                        console.log(chalk.yellow("T" + task) + ': ' + chalk.green('[+]') + " Script \"" + scriptName + "\" executed on device \"" + req.params.device + "\"");

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

                        resolveScripts();
                    });
                });

                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished single-run scripts.");
                ssh.dispose();
                console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Disconnected to device \"" + req.params.device + "\" via SSH.");
                resolveSession();
            }).catch(e => {
                console.error(chalk.yellow("T" + task) + ': ' + chalk.red('[-]') + " Script \"" + scriptName + "\" failed on device \"" + req.params.device + "\"");
                console.error(chalk.red(e));
                resolveSession();
            });
        });

        console.log(chalk.yellow("T" + task) + ': ' + chalk.blue('[i]') + " Finished task \"" + task + "\".");
    } else {
        res.status(401);
        res.send("UNAUTHORIZED");
    }
});

app.listen(process.env.PORT, () => {
    console.log(chalk.blue('[i]') + ` Server is listening on port ${process.env.PORT}`);
});