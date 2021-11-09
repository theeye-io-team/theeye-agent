#uninstall
echo "uninstalling"

# 1. check it

ps -ef | grep agent

# 2. stop the service

service theeye-agent stop


# 3. remove the binary

rm -rf /opt/theeye-agent/

# 4. remove the update and watchdog cron scripts

rm -f /etc/cron.d/agentupdate
rm -f /etc/cron.d/agentwatchdog

# 5. remove config file

rm /etc/theeye/theeye.conf
rmdir /etc/theeye/

# 6. remove the services and utilities

rm /etc/init/theeye-agent.*
rm /etc/systemd/system/theeye-agent.service
rm /etc/systemd/system/multi-user.target.wants/theeye-agent.service

# 7. remove logrotate if present

rm /etc/logrotate.d/theeye-agent

# 8. remove system users

userdel theeye-a
groupdel theeye-a

