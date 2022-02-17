# Linux Basic System Update Server

Very basic utility to update all devices specified from a single server.

## The concept

Every device makes a ping to a central server. Then, if authorised, the server opens an ssh session into the device and executes a few scripts.

Devices make their ping to: ``http://server.tld/ping/DEVICE_NAME/DEVICE_SECRET``

## Configuration

Specify a port and host in the .env file, define your devices in the ``devices.json`` file as noted in the example file.

Add .sh files in the scripts-repeat folder for scripts that should be executed on every run. Add .sh files in the scripts-once folder for scripts that should be executed just once on every device.

## Device enrollment

To mass enroll devices, I made a little script which loops through your devices.json file. It enters sudo mode and create a unit (systemd service) that runs each time the system wakes up from sleep, or boots. It waits 10 seconds, then pings the master. Make sure to properly configure the host in the .env file! can be IP or hostname.