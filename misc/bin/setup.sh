#!/bin/bash
#Author: Javi.
#Last: Version verification Added.
#Todo: replace node installation with: https://github.com/joyent/node/wiki/installing-node.js-via-package-manager
#This script download,install and add a cronjob for the eye-agent update
PATH="/bin:/sbin:/usr/bin:/usr/sbin"

if [[ -z $1 || -z $2 || -z $3 ]]; then
  echo "Value missing, please run as follows: 
  $0 THEEYE_SUPERVISOR_CLIENT_ID THEEYE_SUPERVISOR_CLIENT_SECRET THEEYE_SUPERVISOR_CLIENT_CUSTOMER"
fi
export clientID=$1
export clientSecret=$2
export clientCustomer=$3

#Configure.
agentUrl='https://s3.amazonaws.com/theeye.agent/linux'
customerAgent='theeye-agent64.tar.gz'
#registerPostUrl='https://logs.theeye.io/installupload/'
destinationPath='/opt/theeye-agent'
#End.

#Environment Envs
systemV=$(stat /proc/1/exe |head -n1|cut -d '>' -f2|grep -E -o \(systemd\|upstart\|sbin\)|head -n 1)
#End Environment Envs

if [ -n "$http_proxy" ];then
  export http_proxy
  export https_proxy=$http_proxy
  export ftp_proxy=$http_proxy
fi

#Added this usefull function from a Stack Overflow post:
#Link: http://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
function coloredEcho {
  local exp=$1;
  case $- in
    *)    echo "$exp"
    ;;
    *i*) local color=$2;
    if ! [[ $color =~ ^[0-9]$ ]] ; then
      case $(echo "$color" | tr '[:upper:]' '[:lower:]') in
        black) color=0 ;;
        red) color=1 ;;
        green) color=2 ;;
        yellow) color=3 ;;
        blue) color=4 ;;
        magenta) color=5 ;;
        cyan) color=6 ;;
        white|*) color=7 ;; # white or invalid color
      esac
    fi
    tput setaf $color;
    echo "$exp";
    tput sgr0;
    ;;
  esac
}

function installCrontabAndLogrotationFile {
  confFile='/etc/theeye/theeye.conf'
  #ojo workaround de proxy.
  #
  echo "*/15 * * * * root http_proxy=$http_proxy /usr/bin/curl -s $agentUrl/setup.sh |bash -s $clientID '$clientSecret' $clientCustomer > /dev/null 2>&1 || true" > /etc/cron.d/agentupdate
  echo 'PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin'> /etc/cron.d/agentwatchdog
  echo '* * * * * root ps axu|grep -v grep|grep agent.runBinary.sh > /dev/null 2>&1; if [ $? -eq "1"  ];then /usr/sbin/service theeye-agent restart > /dev/null 2>&1  ;fi ||true ' >> /etc/cron.d/agentwatchdog
  echo "
  /var/log/backend/*.log {
    daily
    rotate 7
    missingok
    create 666 root root
    compress
    sharedscripts
    postrotate
    /usr/bin/service theeye-agent restart || /usr/bin/systemctl restart theeye-agent
    endscript
  } " > /etc/logrotate.d/theeye-agent
  mkdir -p /etc/theeye
  echo "
  #!/bin/bash
  set -a
  THEEYE_SUPERVISOR_CLIENT_ID='$clientID'
  THEEYE_SUPERVISOR_CLIENT_SECRET='$clientSecret'
  THEEYE_SUPERVISOR_CLIENT_CUSTOMER='$clientCustomer'
  THEEYE_AGENT_SCRIPT_PATH='$destinationPath/scripts'
  THEEYE_AGENT_DEBUG='eye:*:error'
  THEEYE_SUPERVISOR_API_URL='https://supervisor.theeye.io'
  NODE_ENV='production'
  http_proxy='$(cat /tmp/http_proxy)'
  https_proxy='$(cat /tmp/http_proxy)'
  THEEYE_AGENT_VERSION='$(curl -s https://s3.amazonaws.com/theeye.agent/linux/version)'
  " > $confFile

  coloredEcho "Cronjob and LogRotation installation Done..." magenta

}

function prepareDirectoriesAndGlobalRequires {
  #temporal, borrar en deploys prox.
  rm -rf /var/theeye
  rm -rf /var/theeye-gent
  #fin
  if [ -d $destinationPath ]
    then
    echo "removing current source directory"
    rm -rf $destinationPath
  fi

  mkdir -p $destinationPath
  mkdir -p /var/log/backend
  coloredEcho "prepare Directories And Global Requires done..." magenta
}

function installSystemVInitScript {
  case "$systemV" in

    "systemd")
    echo "doing systemd installation"
    cp $destinationPath/misc/etc/systemd/system/* /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable theeye-agent
    ;;

    "upstart")
    echo "doing upstart installation"
    cp $destinationPath/misc/etc/upstart/init/* /etc/init/
    ;;

    "sbin")
    echo "starring sbin file"
    systemV=$(stat /sbin/init |head -n1|cut -d '>' -f2|grep -E -o \(systemd\|upstart\|sbin\)|head -n 1)
    echo "ok new systemV reached $systemV"
    if [ "$systemV" == "sbin" ];then  #Instead of sbin recieved I guess upstart would work anyway I've to stop recursion so...
      echo  "I guess upstart would works, If it doesn't please contact theeye.io team"
      systemV='upstart'
    fi
      installSystemVInitScript
    ;;

    *)
    echo "unkown systemV initialization doing both upstart and systemd"
     upstart
     systemd
    ;;

  esac
}
#Fixes for particular issues that we found on some platforms.
function fixCustomSOissues {
#Fuse error redhat like S.O, not the best solution but this soft is intended for servers 
#not gnome sessions on X.
overrideGVFS=$(su - theeye-a -c 'df;echo $?'|tail -n1)
if [[ $overrideGVFS == "1" ]];then 
  echo "#We really want to run df without any exception" >> /etc/fuse.conf
  echo "user_allow_other" >> /etc/fuse.conf
  service display-manager stop
  service display-manager start
fi
}
function downloadAndSetupAgent {
  sudoerFile='/etc/sudoers.d/theeye-agent'
  service theeye-agent stop || systemctl stop theeye-agent
  cd $destinationPath/../
  coloredEcho "Downloading agent and installing it at $destinationPath ..." cyan
  curl -O $agentUrl/$customerAgent
  coloredEcho "Uncompressing Agent ..." cyan
  tar -xvzf $customerAgent
  coloredEcho "Configuring SystemV for theeye-agent service ..." cyan
  installSystemVInitScript
  coloredEcho "Adding user theeye-a and giving sudoer permission ..." cyan
  useradd theeye-a || useradd theeye-a -g theeye-a
  echo "#This is a very permisive way to execute scripts
        #We encorauge you to set specific sudoer execution for each script you need to run as root" > $sudoerFile
  echo "theeye-a ALL=(ALL) NOPASSWD: ALL" >> $sudoerFile
  chmod 440 $sudoerFile
  coloredEcho "Changing ownerships for destinationPath ..." cyan
  chown -R theeye-a $destinationPath
  cd $destinationPath
  coloredEcho "Agent Setup done..." magenta
}
function bannerPrint {
  tput setaf 2;
echo "
                :                              :
              :                                 :
            :                                   :
            :  RRVIttIti+==iiii++iii++=;:,       :
            : IBMMMMWWWWMMMMMBXXVVYYIi=;:,        :
            : tBBMMMWWWMMMMMMBXXXVYIti;;;:,,      :
            t YXIXBMMWMMBMBBRXVIi+==;::;::::       ,
           ;t IVYt+=+iIIVMBYi=:,,,=i+=;:::::,      ;;
           YX=YVIt+=,,:=VWBt;::::=,,:::;;;:;:     ;;;
           VMiXRttItIVRBBWRi:.tXXVVYItiIi==;:   ;;;;
           =XIBWMMMBBBMRMBXi;,tXXRRXXXVYYt+;;: ;;;;;
            =iBWWMMBBMBBWBY;;;,YXRRRRXXVIi;;;:;,;;;=
             iXMMMMMWWBMWMY+;=+IXRRXXVYIi;:;;:,,;;=
             iBRBBMMMMYYXV+:,:;+XRXXVIt+;;:;++::;;;
             =MRRRBMMBBYtt;::::;+VXVIi=;;;:;=+;;;;=
              XBRBBBBBMMBRRVItttYYYYt=;;;;;;==:;=
               VRRRRRBRRRRXRVYYIttiti=::;:::=;=
                YRRRRXXVIIYIiitt+++ii=:;:::;==   Hey Bud,
                +XRRXIIIIYVVI;i+=;=tt=;::::;:;   We're Done!
                 tRRXXVYti++==;;;=iYt;:::::,;;
                  IXRRXVVVVYYItiitIIi=:::;,::;
                   tVXRRRBBRXVYYYIti;::::,::::
                    YVYVYYYYYItti+=:,,,,,:::::;
                    YRVI+==;;;;;:,,,,,,,:::::::         "
  tput sgr0;
}
#Verify Installed version and if it's outdated or doesn't exists. Install it.
currentVersion=$(curl -s https://s3.amazonaws.com/theeye.agent/linux/version)
cat /etc/theeye/theeye.conf | grep $currentVersion
if [ $? -eq 0 ] && [ "$set" != "force" ];then
	echo "No updates, Want to force installation? run it as follows:
	curl $agentUrl/setup.sh |sudo set=force bash -s $clientID $clientSecret $clientCustomer"
else
	echo "Old version/No version found.
	installing...."
	installLog="/tmp/$clientCustomer.$(hostname -s).theEyeInstallation.log"

	echo "starting at $(date)"> $installLog
	echo "running with url $agentUrl and $customerAgent">> $installLog
	echo "with running processes $(ps axu)">> $installLog
	rm $installLog.gz 2>&1 | $tee

	tee="tee -a $installLog"
	echo infoPlus:$(hostname && ifconfig ) 2>&1 | $tee

	coloredEcho "setting http_proxy. $http_proxy" red 2>&1 | $tee
	echo "$http_proxy" > /tmp/http_proxy

#	coloredEcho "Step 1 of 5- Check if nodeJS exists and If it doesn't, install it." green 2>&1 | $tee
#	baseInstall 2>&1 | $tee

	coloredEcho "Step 2 of 5- Installing Cron File for agent update" green 2>&1 | $tee
	installCrontabAndLogrotationFile 2>&1 | $tee

	coloredEcho "Step 3 of 5- Prepare Directories and Global requires such as supervisor" green 2>&1 | $tee
	prepareDirectoriesAndGlobalRequires 2>&1 | $tee

	coloredEcho "Step 4 of 5- download the agent, Install/Upgrade it , untar it and create/update system users " green 2>&1 | $tee
	downloadAndSetupAgent 2>&1 | $tee

	coloredEcho "Step 5 of 5- Restart the agent and tell remote server that updation has finished. " greenn 2>&1 | $tee
	fixCustomSOissues
	service theeye-agent stop || systemctl stop theeye-agent
	service theeye-agent start || systemctl start theeye-agent
	echo "## List Process Running:"  >> $installLog
	ps -ef |grep theeye  >> $installLog
	echo "## theeye-agent:"  >> $installLog
	cat /etc/init/theeye-agent.conf 2>&1 | $tee
	echo "## agent config (/etc/theeye/theeye.conf):"  >> $installLog
	cat /etc/theeye/theeye.conf >> $installLog
	echo "## last agent lines" >> $installLog
	tail -n 100 /var/log/backend/theeye-a.log >> $installLog
	#echo doing post: $http_proxy curl $registerPostUrl -F "installlog=@$installLog">> $installLog
	#gzip $installLog
	#curl -0 $registerPostUrl -F "installlog=@$installLog.gz"
fi
ps axu |grep theeye-a|grep -v grep
if [ $? -eq "1" ];then 
       echo "Dough!. Something went wrong,"
       echo "Please send us an email to support@theeye.io indicating:
             Operative System / Version and attaching your /tmp/$installLog"
       echo "starting manually...."
       nohup $destinationPath/runBinary.sh &
else
  bannerPrint
  echo "We added sudoer permission at $sudoerFile, you can move forward and customize It for matching your security criteria"
fi
