# Obtain superuser privileges
echo PASS | sudo -S -v

# Refresh repositories
sudo apt-get update -y

# Remove unneeded packages, to prevent errors at the next step
sudo apt autoremove -y

# Upgrade the packages
sudo apt upgrade -y

# End of the script
exit
