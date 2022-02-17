# Make sure sudo can be executed.
echo '{{PASSWORD}}' | sudo -S -v

# Check if unit already exists.
if [ ! -f /etc/systemd/system/lbsus-ping.service ]; then
    # Add the unit.
    sudo bash -c 'cat << EOT >> /etc/systemd/system/lbsus-ping.service
    [Unit]
    Description=Makes a ping to the lbsus server on wakeup and boot
    After=network.target suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target

    [Service]
    ExecStartPre=/bin/sleep 40
    ExecStart=/usr/bin/wget -q -O- http://{{HOST}}:{{PORT}}/ping/6l-ltinf17/41is0g
    TimeoutSec=60

    [Install]
    WantedBy=suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target multi-user.target'

    # Enable the unit
    sudo systemctl daemon-reload
    sudo systemctl enable lbsus-ping
fi