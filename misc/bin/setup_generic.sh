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
agentUrl='http://interactar.com/public/install/041fc48819b171530c47c0d598bf75ad08188836'
customerAgent='generic-agent.tar.gz'
registerPostUrl='http://interactar.com/installupload/'
destinationPath='/opt/theeye-agent'
#End.

#Environment Envs
systemV=$(stat /proc/1/exe |head -n1|cut -d '>' -f2|egrep -o \(systemd\|upstart\|sbin\)|head -n 1)
#End Environment Envs

if [ \! -z $http_proxy ];then
  export http_proxy
  export https_proxy=$http_proxy
  export ftp_proxy=$http_proxy
fi

#Added this usefull function from a Stack Overflow post:
#Link: http://stackoverflow.com/questions/5947742/how-to-change-the-output-color-of-echo-in-linux
function coloredEcho {
  local exp=$1;
  case $- in
    *)    echo $exp
    ;;
    *i*) local color=$2;
    if ! [[ $color =~ '^[0-9]$' ]] ; then
      case $(echo $color | tr '[:upper:]' '[:lower:]') in
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
    echo $exp;
    tput sgr0;
    ;;
  esac
}

function installUbuntuDebianPackages {
    coloredEcho "Installing Ubuntu Packages..." magenta
    # Installing last node and npm version
    #Works for Ubuntu:Lucid  Precise  Saucy  Trusty  Utopic
    coloredEcho "Installing curl..." magenta
    apt-get install -y --force-yes curl sudo
    curl -sL https://deb.nodesource.com/setup_0.12 | bash -
    apt-get install -y nodejs 2>&1 >> $installLog
    coloredEcho "Base Install Done..." magenta
}

function installRedhatCentosFedoraPackages {
    coloredEcho "Installing Centos/RHEL/Fedora Packages..." magenta
    yum install -y curl
	  curl -sL https://rpm.nodesource.com/setup_0.10 | bash -
    yum install -y nodejs npm gcc-c++ make
    coloredEcho "Base Install Done..." magenta
}

#nodeJs installation
function baseInstall {
  node_path=$(which node)
  if [ -z $node_path ] ; then
    # Instaling Base:
    coloredEcho "nodeJS is Missing, Instalation begins..." red
    coloredEcho "Installing nodejs..." magenta
    linuxFlavor=$(awk -F= '/^NAME/{print $2}' /etc/os-release|sed 's/"//g'|cut -d' ' -f1)
    if [ -z $linuxFlavor ];then
      linuxFlavor=$(gawk -F= '/^NAME/{print $2}' /etc/os-release|sed 's/"//g'|cut -d' ' -f1)
    fi
    if [ -z $linuxFlavor ];then
      linuxFlavor=`head -n1 /etc/issue |sed 's/"//g'|cut -d' ' -f1`
    fi

    echo "$linuxFlavor time !!!!!!!!!!!<<<<"
    case "$linuxFlavor" in
        "Ubuntu"|"Debian")
            installUbuntuDebianPackages
        ;;

        "CentOS"|"Fedora"|"Red")
            installRedhatCentosFedoraPackages
        ;;

        *)
            echo "unkown Linux Flavor $linuxFlavor"
        ;;

    esac


    # All extra stuff for server add here
    coloredEcho "nodeJs Setup Finished, moving forward" green
  fi
  coloredEcho "base Install Done..." magenta
}

function installCrontabAndLogrotationFile {
  confFile='/etc/theeye/theeye.conf'
  #ojo workaround de proxy.
  #
  echo "*/15 * * * * root http_proxy=$http_proxy $agentUrl/setup.sh |bash -s $clientID '$clientSecret' $clientCustomer &> /dev/null " > /etc/cron.d/agentupdate
  echo '* * * * * root ps axu|grep -v grep|grep agent.run.sh &>/dev/null; if [ $? -eq "1"  ];then service theeye-agent restart;fi ' > /etc/cron.d/agentwatchdog
  echo "
  /var/log/backend/*.log {
    daily
    rotate 7
    missingok
    create 666 root root
    compress
    sharedscripts
    postrotate
    /usr/bin/service theeye-agent restart
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
  THEEYE_AGENT_VERSION='v0.5.1-beta-23-g637cd97'
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
  mkdir /var/log/backend
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
    systemV=$(stat /sbin/init |head -n1|cut -d '>' -f2|egrep -o \(systemd\|upstart\|sbin\)|head -n 1)
    echo "ok new systemV reached $systemV"
    if [ $systemV == "sbin" ];then  #Instead of sbin recieved I guess upstart would work anyway I've to stop recursion so...
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
if [ $overrideGVFS == "1" ];then 
  echo "#We really want to run df without any exception" >> /etc/fuse.conf
  echo "user_allow_other" >> /etc/fuse.conf
  service display-manager stop
  service display-manager start
fi
}
function downloadAndSetupAgent {
  sudoerFile='/etc/sudoers.d/theeye-agent'
  service theeye-agent stop
  cd $destinationPath/../
  coloredEcho "Downloading agent and installing it at $destinationPath ..." cyan
  curl -O $agentUrl/$customerAgent
  coloredEcho "Uncompressing Agent ..." cyan
  tar -xvzf $customerAgent
  coloredEcho "Configuring SystemV for theeye-agent service ..." cyan
  installSystemVInitScript
  coloredEcho "Adding user theeye-a and giving sudoer permission ..." cyan
  useradd theeye-a || useradd theeye-a -g theeye-a
  echo "theeye-a ALL=(ALL) NOPASSWD: ALL" > $sudoerFile
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
gitVersion=$(curl -s https://api.github.com/repos/interactar/theeye-agent/git/refs/heads/master|grep sha|cut -d\" -f4|sed -r 's/(.{7}).*/\1/')
cat /etc/theeye/theeye.conf | grep $gitVersion
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
	rm $installLog.gz

	tee="tee -a $installLog"
	echo infoPlus:$(hostname && ifconfig ) 2>&1 | $tee

	coloredEcho "setting http_proxy. $http_proxy" red 2>&1 | $tee
	echo $http_proxy > /tmp/http_proxy

	coloredEcho "Step 1 of 5- Check if nodeJS exists and If it doesn't, install it." green 2>&1 | $tee
	baseInstall 2>&1 | $tee

	coloredEcho "Step 2 of 5- Installing Cron File for agent update" green 2>&1 | $tee
	installCrontabAndLogrotationFile 2>&1 | $tee

	coloredEcho "Step 3 of 5- Prepare Directories and Global requires such as supervisor" green 2>&1 | $tee
	prepareDirectoriesAndGlobalRequires 2>&1 | $tee

	coloredEcho "Step 4 of 5- download the agent, Install/Upgrade it , untar it and create/update system users " green 2>&1 | $tee
	downloadAndSetupAgent 2>&1 | $tee

	coloredEcho "Step 5 of 5- Restart the agent and tell remote server that updation has finished. " greenn 2>&1 | $tee
	fixCustomSOissues
	service theeye-agent stop
	service theeye-agent start
	echo "## List Process Running:"  >> $installLog
	ps -ef |grep theeye  >> $installLog
	echo "## dump run.sh:"  >> $installLog
	cat $destinationPath/run.sh 2>&1 >> $installLog
	echo "## theeye-agent:"  >> $installLog
	cat /etc/init/theeye-agent.conf >> $installLog
	echo "## agent config (/etc/theeye/theeye.conf):"  >> $installLog
	cat /etc/theeye/theeye.conf >> $installLog
	echo "## last agent lines" >> $installLog
	tail -n 100 /var/log/backend/theeye-a.log >> $installLog
	echo doing post: $http_proxy curl $registerPostUrl -F "installlog=@$installLog">> $installLog
	gzip $installLog
	curl -0 $registerPostUrl -F "installlog=@$installLog.gz"
fi
ps axu |grep theeye-a|grep -v grep
if [ $? -eq "1" ];then 
       echo "Dough!. Something went wrong,"
       echo "Please send us an email to support@theeye.io indicating:
             Operative System / Version and attaching your /tmp/*.theEyeInstallation.log.gz"
       echo "starting manually...."
       /opt/theeye-agent/run.sh
else
  bannerPrint
fi
