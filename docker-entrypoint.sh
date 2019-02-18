#!/bin/bash

#mbsinc MAIL_FOLDER=$( grep "Path" ${SYNC_CONFIG} | cut -d " " -f 2 )
#mbsinc 
#mbsinc if [ ! -d ${MAIL_FOLDER} ]; then
#mbsinc     mkdir -p ${MAIL_FOLDER} && \
#mbsinc     chmod 750 ${MAIL_FOLDER}
#mbsinc fi
#mbsinc echo "* * * * *	sleep ${SYNC_INTERVAL} && /usr/local/bin/mbsync -c ${SYNC_CONFIG} ${CHANNEL} 2>&1" > /etc/cron.d/isync && \

/usr/bin/curl -s "https://s3.amazonaws.com/theeye.agent/linux/setup.sh" | bash -s  "$THEEYE_SUPERVISOR_CLIENT_ID" "$THEEYE_SUPERVISOR_CLIENT_SECRET" "$THEEYE_SUPERVISOR_CLIENT_CUSTOMER"
sed -i "s/THEEYE_SUPERVISOR_CLIENT_ID=''/THEEYE_SUPERVISOR_CLIENT_ID=$THEEYE_SUPERVISOR_CLIENT_ID/g" /etc/theeye/theeye.conf
sed -i "s/THEEYE_SUPERVISOR_CLIENT_SECRET=''/THEEYE_SUPERVISOR_CLIENT_SECRET=$THEEYE_SUPERVISOR_CLIENT_SECRET/g" /etc/theeye/theeye.conf
sed -i "s/THEEYE_SUPERVISOR_CLIENT_CUSTOMER=''/THEEYE_SUPERVISOR_CLIENT_CUSTOMER=$THEEYE_SUPERVISOR_CLIENT_CUSTOMER/g" /etc/theeye/theeye.conf

exec "$@"
