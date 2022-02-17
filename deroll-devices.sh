# Make sure sudo can be executed.
echo '{{PASSWORD}}' | sudo -S -v

# Check if unit already exists.
if [ -f /etc/systemd/system/lbsus-ping.service ]; then
    # Add the unit.
    sudo rm /etc/systemd/system/lbsus-ping.service

    # Refresh systemctl
    sudo systemctl daemon-reload
fi