echo '{{PASSWORD}}' | sudo -S -v

if [ ! -f /etc/systemd/system/lbsus-ping.service ]; then
    sudo cat << EOT >> /etc/systemd/system/lbsus-ping.service
    [Unit]
    Description=Makes a ping to the lbsus server on wakeup and boot
    After=network.target suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target

    [Service]
    ExecStartPre=/bin/sleep 120
    ExecStart=/usr/bin/wget -O- http://{{HOST}}:{{PORT}}/ping/6l-ltinf17/41is0g

    [Install]
    WantedBy=suspend.target hibernate.target hybrid-sleep.target suspend-then-hibernate.target multi-user.target
    EOT
fi