# Linux Basic System Update Server

Very basic utility to update all devices specified from a single server.

## The concept

Every device makes a ping to a central server. Then, if authorised, the server opens an ssh session into the device and executes a few scripts.

Devices make their ping to: ``http://server.tld/ping/DEVICE_NAME/DEVICE_SECRET``

## Configuration

Specify a port in the .env file, define your devices in the ``devices.json`` file as noted in the example file.

Add .sh files in the scripts-repeat folder for scripts that should be executed on every run. Add .sh files in the scripts-once folder for scripts that should be executed just once on every device.