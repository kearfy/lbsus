import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import chalk from 'chalk';

async function log(msg, toConsole = true) {
    //If, should be posted in console, log to console.
    if (toConsole) console.log(msg);

    //Check if logfile exists.
    var logFile = './logs/enroll-devices.system.log.txt';
    if (!fs.existsSync(logFile)) {
        try {
            fs.writeFileSync(logFile, '===== START OF LOGS =====');
        } catch (e) {
            //Oh no, Failed to create logfile! Shout it into console.
            console.log(chalk.red('[-]') + " Failed to create logfile for enrollment process");
            console.log(chalk.red(e));
            return false;
        }
    }

    //Append message to logfile.
    fs.appendFileSync(logFile, "\n" + msg.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, ''));
    return true;
}

(async function() {
    let devicesRaw = fs.readFileSync('./devices.json');
    var devices = JSON.parse(devicesRaw);
    var deviceNames = Object.keys(devices);

    await log(chalk.blue('[i]') + " Retrieved devices, starting enrollment.");

    for (var i = 0; i < deviceNames.length; i++) {
        var deviceName = deviceNames[i];
        var device = devices[deviceName];
        await log(chalk.blue('[i]') + " Connecting to device \"" + deviceName + "\".");

        let enrollScript = fs.readFileSync('./enroll-devices.sh');
        enrollScript.replace('{{PASSWORD}}', device.password);
        enrollScript.replace('{{HOST}}', process.env.HOST);
        enrollScript.replace('{{PORT}}', process.env.PORT);
        await log(chalk.blue('[i]') + " Prepared enrollment script for device \"" + deviceName + "\".");

        await new Promise(async (resolveSession, rejectSession) => {
            const ssh = new NodeSSH();
            ssh.connect(device).then(async () => {
                await log(chalk.green('[+]') + " Connected to device \"" + deviceName + "\" via SSH.");
                await log(chalk.blue('[i]') + " Start enrolling device \"" + deviceName + "\".");

                let res = await ssh.execCommand('bash -s', {stdin: enrollScript});
                if (res.code == 0) {
                    await log(chalk.green('[+]') + " Enrolled device \"" + req.params.device + "\"");
                    await log("\n" + res.stdout + "\n", false);
                } else {
                    await log(chalk.red('[-]') + " Enrollment failed on device \"" + req.params.device + "\"");
                    await log(chalk.red(res.code));
                    await log("\n" + chalk.red(res.stdout) + "\n");
                }
                
                //Disconnect from SSH session and resolve the promise.
                ssh.dispose();
                await log(chalk.blue('[i]') + " Disconnected from device \"" + req.params.device + "\"");
                resolveSession();
            }).catch(async e => {
                await log(chalk.red('[-]') + " Failed to connect to device \"" + deviceName + "\"");
                await log(chalk.red(e));
                resolveSession();
            });
        });
    }

    await log(chalk.blue('[i]') + " Finished enrolling devices.");
})();