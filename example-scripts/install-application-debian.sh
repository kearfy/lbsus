# Obtain superuser privileges
echo PASS | sudo -S -v

# Create temporary filename, define target download file.
TEMPFILE="$(mktemp /tmp/installer.XXXXXXXXXXX)"
DOWNLOAD="https://download.url/filename.deb"

# Download the installer file
wget -q -O $DOWNLOAD $TEMPFILE

# Install the file just downloaded
sudo dpkg -i $TEMPFILE

# End of the script
exit
